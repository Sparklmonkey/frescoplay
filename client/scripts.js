const attemptsTolerance = 5;
const distanceAnswerTolerance = 0.8;
const nextQuestionDelay = 1500;
const viewChangeDelay = 3000;
const courseLoadDelay = 5000;
const apiKey = window.localStorage.getItem('playWebApp.api_key');
let stopApp = false;
let response = undefined;
let assessmentDone = false;
let coursesToDo = [];
let isQuizIdle = false;

const levenshteinDistance = (a, b) => {
    if(a.length == 0) return b.length; 
    if(b.length == 0) return a.length; 

    var matrix = [];

    // increment along the first column of each row
    var i;
    for(i = 0; i <= b.length; i++){
        matrix[i] = [i];
    }

    // increment each column in the first row
    var j;
    for(j = 0; j <= a.length; j++){
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++){
        for(j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                        Math.min(matrix[i][j-1] + 1, // insertion
                                                matrix[i-1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
};

const jaroWrinker = (s1, s2) => {
    var m = 0;

    // Exit early if either are empty.
    if ( s1.length === 0 || s2.length === 0 ) {
        return 0;
    }

    // Exit early if they're an exact match.
    if ( s1 === s2 ) {
        return 1;
    }

    var range     = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1,
        s1Matches = new Array(s1.length),
        s2Matches = new Array(s2.length);

    for ( i = 0; i < s1.length; i++ ) {
        var low  = (i >= range) ? i - range : 0,
            high = (i + range <= s2.length) ? (i + range) : (s2.length - 1);

        for ( j = low; j <= high; j++ ) {
			if ( s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j] ) {
				++m;
				s1Matches[i] = s2Matches[j] = true;
				break;
			}
        }
    }

    // Exit early if no matches were found.
    if ( m === 0 ) {
        return 0;
    }

    // Count the transpositions.
    var k = n_trans = 0;

    for ( i = 0; i < s1.length; i++ ) {
        if ( s1Matches[i] === true ) {
			for ( j = k; j < s2.length; j++ ) {
				if ( s2Matches[j] === true ) {
				k = j + 1;
				break;
				}
			}

			if ( s1[i] !== s2[j] ) {
				++n_trans;
			}
        }
    }

    var weight = (m / s1.length + m / s2.length + (m - (n_trans / 2)) / m) / 3,
        l      = 0,
        p      = 0.1;

    if ( weight > 0.7 ) {
        while ( s1[l] === s2[l] && l < 4 ) {
        ++l;
        }

        weight = weight + l * p * (1 - weight);
    }

    return weight;
}

const loadAnswersJson = () => {	
	try {
		let urlArray = document.URL.split('/');
		let quizId = urlArray[4];
		fetch(`https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/answers/${quizId}.json`)
			.then( response => response.text())
			.then( responseObject => {			
				response = JSON.parse(responseObject);
				selectCorrectAnswer();
			});
	} catch (error) {
		console.log(`Error trying to load the answers. Details: ${error.message}`);
	}
}

const getCandidatesAndBestOne = (sourceArray, text, property) => {
	try {
		// We must find the question that probably has format differences, so let's use some distance algorithms
		let candidates = sourceArray.map((element) => {
			return {
				'distance0': levenshteinDistance(text.trim().toLowerCase(), element[property].trim().toLowerCase()),
				'distance1': jaroWrinker(text.trim().toLowerCase(), element[property].trim().toLowerCase()),
				'value': element
			}
		});
		
		let bestOne = candidates.sort((a, b) => a.distance0 - b.distance0 || b.distance1 - a.distance1)[0];
		
		return {
			'candidates': candidates,
			'best': bestOne
		};
	} catch (error) {
		console.log(`Error trying to get the candidates. Details: ${error.message}`)
	}
}

const doResponseIntent = function(attempts, callback){
};

const selectCorrectAnswer = (attempts=0) => {	
	let nextAttempt = attempts + 1;

	const finishAssessment = (btn, callback) => {
		btn.click();
		setTimeout(() => {
			assessmentDone = true;
			callback();
		}, viewChangeDelay);
	};

	if(!isQuizIdle){
		isQuizIdle = true;

		try {
			let btnSubmitQuiz = document.getElementById('quizSubmitBtn') || { "attributes" : { "cursor" : { "value" : "none" } } };
			let btnGoToMyCourses = document.getElementsByClassName('btn')[0];
			let btnProceed = document.getElementsByClassName('proceedBtn')[0];

			// Submit available
			//if (btnSubmitQuiz != undefined){
			if (btnSubmitQuiz.attributes.cursor.value === 'pointer') {
				// Press the submit button
				finishAssessment(btnSubmitQuiz, doAssessment);
			//}
			} else if (btnProceed != undefined) {
				// Press the go to my courses button
				finishAssessment(btnProceed, () => {
					//If you reach this line that means that you already finished the last course
					startHomeSearch();
				});

			} else if (btnGoToMyCourses != null) {
				// If you have hands-on tasks... we'll continue with the next course
				if (btnGoToMyCourses.innerText == "GO TO HANDS-ONS") {
					// Press the go to my courses button
					finishAssessment(document.getElementsByClassName('proceedBtn')[0], () => {
						//If you reach this line that means that you already finished the last course
						startHomeSearch();
					});
				}
			} else {			
				let currQuestion = document.getElementsByClassName('question')[0].innerText.trim();
				
				try {
					let currAnswer = null;
					let questionCandidate = null;

					// Might throw null pointer
					if (response.questions.find( it => it.question.includes(currQuestion)) != undefined) {
						currAnswer = response.questions.find( it => it.question.includes(currQuestion)).answer;
					} else {
						questionCandidate = getCandidatesAndBestOne(response.questions, currQuestion, 'question'); 
						console.log(questionCandidate);
						currAnswer = questionCandidate.best.value.answer; //questionCandidate.value.answer;
					}
					
					let answerOptions = Array.from(document.getElementsByClassName('answerOptions')[0].children).filter(it => it.tagName == "LABEL");
					let answerCandidate = getCandidatesAndBestOne(answerOptions, currAnswer, 'innerText');

					if (answerCandidate.best.distance1 > 0 && answerCandidate.best.distance1 < distanceAnswerTolerance) {
						// Our best candidate is not the best...				
						console.log(`Maybe we don't have the correct answer for this question or probably the fresco-team want to ambush our beloved script.` +
						`Try answer this one by yourself.\n` +
						`Best Candidate:\n` +
						`Question: "${questionCandidate.best.value.question}"\n`+
						`Answer: "${questionCandidate.best.value.answer}"`);

						let searchOnGoogle = confirm(`Yup we don't have this question, but there's a friend that can help us.\nDo you want to search this question in google?`);						
						if(searchOnGoogle){
							window.open(`http://google.com/search?q=${currQuestion}`);
						}									
					} else {
						// Might throw null pointer (CURRENTLY NOT WORKING)
						let correctAnswerObject = answerCandidate.best.value.previousElementSibling; 
						correctAnswerObject.click();
					}
				} catch (error) {
					console.log(`No answers for this question: ${currQuestion}.\nDetails: ${error.message}`);
					throw error;
				}
			}
		} catch (error) {		
			if (attempts < attemptsTolerance) {			
				console.log(`Let's try again: Attempt ${nextAttempt} of ${attemptsTolerance}`);
				setTimeout(() => {
					selectCorrectAnswer(nextAttempt);
				}, viewChangeDelay);

			} else {
				console.log('Dude... finish this course manually');
				//stopApplication();
			}
		}

		isQuizIdle = false;
	}		
};

const doAssessment = (attempts=0) => {
	let nextAttempt = attempts + 1;

	try {		
		const startTheCourse = (event, attempt) => {
			event();
			setTimeout(() => {
				doCourse(attempt);
			}, viewChangeDelay);
		};

		if(!assessmentDone){
			response = undefined;
			addBtnClickEventListener();
			loadAnswersJson();

		} else {
			let modalContent = document.getElementsByClassName('modalContent')[0];

			if (modalContent != undefined) {
				let continueBtn = Array.from(document.getElementsByClassName('modalContent')[0].children).find(it => it.innerText === 'CONTINUE');
				if(continueBtn !== undefined) {					
					startTheCourse(() => continueBtn.click(), 1);		
				} else {
					// Probably you didn't pass the quiz
					let retryBtn = document.getElementsByClassName('spaceAroundButton').length > 0 ? document.getElementsByClassName('spaceAroundButton')[1] : undefined;
					if (retryBtn !== undefined) {
						// Just to double checked it
						if (retryBtn.innerText === 'RETRY') {
							// Yep... you're almost f*up bro
							let tryAgain = confirm(`It's probably that we don't have the correct answers for this quiz. Do you want to try it again (at your own risk)?`);
							if (tryAgain) {
								startTheCourse(() => retryBtn.click(), 1);		
							} else {
								console.log('Ok smartass... go ahead and do it by your own... bye!');
								stopApplication();
							}
						}
					} else {
						console.log(`Sorry bro... I don't know what happened here :(`);
					}
				}
			} else {
				// Let's check if we're currently inside a quiz				
				let currentUrl = document.URL.split('/');
				if (currentUrl[currentUrl.length - 1] == 'quiz') {
					throw Error('Non-expected behavior');
				}					
			}
		}
	} catch (error) {
		console.log(`Error trying to finish the assessment. Details: ${error.message}`);

		if (attempts < attemptsTolerance) {			
			console.log(`Let's try again: Attempt ${nextAttempt} of ${attemptsTolerance}`);
			setTimeout(() => {
				doCourse(nextAttempt);
			}, viewChangeDelay);

		} else {
			console.log('Dude... finish this course manually');
			//stopApplication();
		}
	}	
};

const addBtnClickEventListener = () => {
	try {
		//THIS WILL HANDLE CALLING QUESTION COMPLETION AFTER QUESTION HAS BEEN AUTOMATICALLY SELECTED, OR MANUALLY SELECTED.
		Array.from(document.querySelectorAll(".navButton.right, .answerOptions")).map( it => {
			it.addEventListener("click", (event) => {				
				if(response) {
					setTimeout(() => selectCorrectAnswer(), nextQuestionDelay)
				}
				else {
					loadAnswersJson()
				}				
			})
		});
	} catch (error) {
		console.log(`Error trying to add the event listener. Details: ${error.message}`)
	}
};

const takeNewAssessment = () => {
	try {
		console.log(">Take Assessment")

		response = undefined;
		assessmentDone = false;
		isQuizIdle = false;
		
		setTimeout(() => {
			addBtnClickEventListener();
			loadAnswersJson();
		}, viewChangeDelay);
	} catch(error) {
		console.log(`Error tring to take the new assessment. Details: ${error.message}`);
	}
};

const doCourse = (attempts=0, callback) => {
	let nextAttempt = attempts + 1;

	try {		
		console.log(">Do Course")

		if (stopApp) {	
			console.log('Application stopped!');
			return;
		}	
		
		let btnNext = document.getElementsByClassName('navButton right')[0];
		if (btnNext != undefined) {
			btnNext.click();
			setTimeout(() => {
				doCourse(attempts);
			}, nextQuestionDelay);			
		} else { 
			// There are two options... one, this could be a congratulations screen, so we'll check it out
			let btnProceed = document.getElementsByClassName('proceedBtn')[0];
			let btnStartQuiz = document.getElementById('startQuiz');
			let btnGoToMyCourses = document.getElementsByClassName('btn')[0];

			if (btnProceed != undefined){
				console.log(">Proceed Click")

				// And yeah! it's a congratulations screen
				btnProceed.click();
				setTimeout(() => {
					doCourse(attempts);
				}, viewChangeDelay);
				return
			} 
			if (btnStartQuiz != undefined){
				console.log(">Start Quiz Click")

				// A wild quiz has appeared!												
				btnStartQuiz.click();
				setTimeout(() => {
					takeNewAssessment();
				}, courseLoadDelay);
				return
			}
			if (btnGoToMyCourses != undefined){
				if (btnGoToMyCourses.innerText === 'GO TO MY COURSES') {
					console.log(">Go to my couses Click")

					btnGoToMyCourses.click();
					setTimeout(() => {
						callback();
					}, viewChangeDelay);
				}
				else {					
					console.log(">Unknown option!")

					// Or there's a probability that we're inside the quiz... so let's start answering it
					let currentUrl = document.URL.split('/');
					if (currentUrl[currentUrl.length - 1] == 'quiz'){
						takeNewAssessment();
					}					
				}
			}		
		} 		
	} catch (error) {		
		console.log('Oooppss... we have a weird behavior here :(');		
		console.log(error);

		if (attempts < attemptsTolerance) {
			console.log(`Let's try again: Attempt ${nextAttempt} of ${attemptsTolerance}`);
			setTimeout(() => {
				doCourse(nextAttempt);
			}, viewChangeDelay);

		} else {
			console.log('Dude... finish this course manually');
			//stopApplication();
		}
	}
};

const distinctObjects = (array) => {
	const result = [];
	const map = new Map();
	for (const item of array) {
	    if(!map.has(item.id)){
	        map.set(item.id, true);    // set any value to Map
	        result.push({
	            id: item.id,
	            name: item.name
	        });
	    }
	}

	return result;
};

const getMyCoursesStatus = (callback) => {
	try {
		const frescoUrl = 'https://play-api.fresco.me/api/v1/progresses.json';
		const coursesUrl = 'https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/answers/courses.json';	

		fetch(frescoUrl, {
			headers: { 'x-api-key' : apiKey }
		})
		.then(response => response.text())
		.then(responseObject => {			
			const frescoStatus = JSON.parse(responseObject);
			console.log(frescoStatus);

			fetch(coursesUrl)
			.then(response => response.text())
			.then(responseObject => {		
				// We filtered from the list the courses that have hands on tasks to do...
				let nonCompletedCourses = frescoStatus.progresses.filter(f => f.status !== 'completed' && !f.node.has_handson);						
				// We took the ones that aren't complete and the user must finish the hands on... just to let him know that he's lazy ass 
				let nonCompletedWithHandson = frescoStatus.progresses.filter(f => f.status !== 'completed' && f.node.has_handson);						

				if (nonCompletedWithHandson.length > 0) {
					// You shall not pass!
					let coursesWithHandsOn = nonCompletedWithHandson.map(course => {
						return `> ${course.node.name} \n`;
					});

					alert(`Here's a bunch of courses that has hands on tasks, complete them.\n\nCourses:\n ${coursesWithHandsOn}`);
				}

				const availableCourses = distinctObjects(JSON.parse(responseObject));

				let toCompleteList = availableCourses.filter(a => {
					return nonCompletedCourses.find(b => b.node.id === a.id);
				}); 
				let toStartList = availableCourses.filter(a => {				
					return frescoStatus.progresses.filter(b => b.node.id === a.id).length === 0
				});

				const toDoList = distinctObjects([].concat(...[toCompleteList, toStartList])).sort((a, b) => a.id - b.id);
				console.log(toDoList);

				callback(toDoList);
			});
		});
	} catch(error) {
		throw error;		
	}
}

const findReactElement = (dom, traverseUp=0) => {
    const key = Object.keys(dom).find(key=>key.startsWith("__reactInternalInstance$"));
    const domFiber = dom[key];
    if (domFiber == null) return null;

    // react <16
    if (domFiber._currentElement) {
        let compFiber = domFiber._currentElement._owner;
        for (let i = 0; i < traverseUp; i++) {
            compFiber = compFiber._currentElement._owner;
        }
        return compFiber._instance;
    }

    // react 16+
    const GetCompFiber = fiber =>{
        //return fiber._debugOwner; // this also works, but is __DEV__ only
        let parentFiber = fiber.return;
        while (typeof parentFiber.type == "string") {
            parentFiber = parentFiber.return;
        }
        return parentFiber;
    };
    let compFiber = GetCompFiber(domFiber);
    for (let i = 0; i < traverseUp; i++) {
        compFiber = GetCompFiber(compFiber);
    }
    return compFiber.stateNode;
}

const enrollCourse = () => {
	try {
		console.log(">Enroll Course")

		const initEnroll = () => {
			let currentCourse = coursesToDo.length > 0 ? coursesToDo[0] : null;

			if (currentCourse == undefined){
				stopApplication();
				alert(`All the courses were finished :)! Pay the subscription!`);
				return;
			}	

			// Go to home view
			console.log(`Waiting a bit to start the following course: ${currentCourse.name}`);
			document.getElementById('sideBarHome').click();

			setTimeout(() => {		
				injectTheCourseLink(currentCourse);
			}, courseLoadDelay);
		}
 
		// Inject the c(o)urse!
		const injectTheCourseLink = (currentCourse) => {
	        let cardLinks = document.getElementsByClassName('cardLink');

	        if (cardLinks.length > 0) {
				//let tmpCourseLink = document.createElement("a");  
		        //tmpCourseLink.href = `/course/${currentCourse.id}`;      
		        // Append the anchor element to the body. 
		        let cardLinkReact = findReactElement(cardLinks[0], 1);
		        cardLinkReact.props.to = `/course/${currentCourse.id}`;
				
				cardLinks[0].click();
	        }        

	        setTimeout(() => {		
				pressTheCourseButtons();
			}, courseLoadDelay);
	    }

        const pressTheCourseButtons = (currentCourse) => {	
			let btnEnrollment = document.getElementById('courseEnroll');
			let btnResume = document.getElementById('courseResume');				

			setTimeout(() => {
				if (btnEnrollment != undefined){
					btnEnrollment.click();		
					pressTheCourseButtons(currentCourse);				
				}

				if (btnResume != undefined) {
					btnResume.click();
					pressTheCourseButtons(currentCourse);					
				}

				if (btnEnrollment == undefined && btnResume == undefined){ 
					startTheCourse(currentCourse);
				}
				
			}, viewChangeDelay);
		};
		
		const startTheCourse = (currentCourse) => {
			setTimeout(() => {
				doCourse(1, () => {
					console.log(`The course: ${currentCourse.name} was finished!`);
					// The current course was finished, so let's start the next one
					startHomeSearch();
				});
			}, viewChangeDelay);
		};		

		initEnroll();
	} catch (error) {
		console.log(error);	
	}
};

const stopApplication = () => {
	console.log(">Stop Application")
	stopApp = true;
};

const restartApplication = () => {
	console.log(">Restart Application")
	stopApp = true;
	startHomeSearch();
};

const startHomeSearch = (attempts=0) => {
	let nextAttempt = attempts + 1;

	try {	
		console.log(">Home Search")
		if (stopApp) {	
			return;
		}		

		const onInitFrescoApp = () => {
			if (coursesToDo.length == 0) {
				getCoursesToDo();
			} else {
				coursesToDo.shift();
				initHomeSearch();
			}
		};

		const getCoursesToDo = () => {
			getMyCoursesStatus(myCoursesToDo => {				
				coursesToDo = myCoursesToDo;	
				initHomeSearch();			
			});
		};

		const initHomeSearch = () => {			
			enrollCourse();	
		};

		onInitFrescoApp();
	} catch (error) {
		console.log('Oooppss... we have a weird behavior here :(');		
		console.log(error);

		if (attempts < attemptsTolerance) {
			console.log(`Let's try again: Attempt ${nextAttempt} of ${attemptsTolerance}`);
			setTimeout(() => {
				startHomeSearch(nextAttempt);
			}, viewChangeDelay);
		} else {
			console.log('Sorry but this was too much for our script... ');
			stopApplication();
		}
	}
}