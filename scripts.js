const attemptsTolerance = 5;
let response = undefined;
let assessmentDone = false;

const levenshteinDistance =  function(a, b){
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

const jaroWrinker = function (s1, s2) {
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

const loadAnswersJson = function() {	
	let urlArray = document.URL.split('/');
	let quizId = urlArray[4];
	fetch(`https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/${quizId}.json`)
		.then( response => response.text())
		.then( responseObject => {			
			response = JSON.parse(responseObject);
			selectCorrectAnswer();
		});
}

const getCandidatesAndBestOne = function(sourceArray, text, property){
	// We must find the question that probably has format differences, so let's use some distance algorithms
	let candidates = sourceArray.map((element) => {
		return {
			'distance0': levenshteinDistance(text.trim(), element[property].trim()),
			'distance1': jaroWrinker(text.trim(), element[property].trim()),
			'value': element
		}
	});
	
	let bestOne = candidates.sort((a, b) => a.distance0 - b.distance0 || b.distance1 - a.distance1)[0];
	
	return {
		'candidates': candidates,
		'best': bestOne
	};
}

const doResponseIntent = function(){

};

const selectCorrectAnswer = function() {	
	let btnSubmitQuiz = document.getElementById('quizSubmitBtn');

	if (btnSubmitQuiz.attributes.cursor.value === 'pointer') { // Submit available
		btnSubmitQuiz.click();
		setTimeout(() => {
			assessmentDone = true;
			doAssessment();
		}, 2000);
	} else {
		let currQuestion = document.getElementsByClassName('question')[0].innerText;
		
		try {
			let currAnswer = null;
			// Might throw null pointer
			if (response.questions.find( it => it.question == currQuestion ) != undefined) {
				 currAnswer = response.questions.find( it => it.question == currQuestion ).answer;
			} else {
				let questionCandidate = getCandidatesAndBestOne(response.questions, currQuestion, 'question'); 
				console.log(questionCandidate);

				currAnswer = questionCandidate.best.value.answer; //questionCandidate.value.answer;
			}
			
			let answerOptions = Array.from(document.getElementsByClassName('answerOptions')[0].children).filter(it => it.tagName == "LABEL");
			let answerCandidate = getCandidatesAndBestOne(answerOptions, currAnswer, 'innerText');

			// Might throw null pointer (CURRENTLY NOT WORKING)
			let correctAnswerObject = answerCandidate.best.value.previousElementSibling; 
			correctAnswerObject.click();
		} catch (error) {
			console.log("No answers for this")
		}
	}
}

const doAssessment = function() {
	if(!assessmentDone){
		response = undefined;
		addBtnClickEventListener();
		loadAnswersJson();
	} else {
		let continueBtn = Array.from(document.getElementsByClassName('modalContent')[0].children).find(it => it.innerText === 'CONTINUE');
		if(continueBtn !== undefined) {
			continueBtn.click();	
			setTimeout(() => {
				doCourse(1);
			}, 2000);		
		}
	}
}

const addBtnClickEventListener = function () {
	//THIS WILL HANDLE CALLING QUESTION COMPLETION AFTER QUESTION HAS BEEN AUTOMATICALLY SELECTED, OR MANUALLY SELECTED.
	Array.from(document.querySelectorAll(".navButton.right, .answerOptions")).map( it => {
		it.addEventListener("click", (event) => {
			if(response)
				setTimeout(() => selectCorrectAnswer(), 1500)
			else
				loadAnswersJson()
		})
	});
}

const takeNewAssessment = function() {
	response = undefined;
	assessmentDone = false;

	addBtnClickEventListener();
	loadAnswersJson();
}

const doCourse = function(attempts) {
	try {
		let btnNext = document.getElementsByClassName('navButton right')[0];
		if (btnNext !== undefined) {
			btnNext.click();
			setTimeout(() => {
				doCourse(attempts);
			}, 1000);
		} else { 
			// There are two options... one, this could be a congratulations screen, so we'll check it out
			let btnProceed = document.getElementsByClassName('proceedBtn')[0];
			if (btnProceed !== undefined) {
				// And yeah! it's a congratulations screen
				btnProceed.click();
				setTimeout(() => {
					doCourse(attempts);
				}, 3000);
			} else {
				// A wild quiz has appeared!
				let btnStartQuiz = document.getElementById('startQuiz');
				if (btnStartQuiz !== undefined) {
					btnStartQuiz.click();
					setTimeout(() => {
						takeNewAssessment();
					}, 3000);
				} else {
					//throw Error('Some weird behavior was detected!');
				}
			}
		}
	} catch (error) {		
		console.log('Oooppss... we have a weird behavior here :(');		
		console.log(error);

		if (attempts < attemptsTolerance) {
			console.log(`Let's try again: Attempt ${attempts} of ${attemptsTolerance}`);
			setTimeout(() => {
				doCourse(attempts++);
			}, 3000);
		} else {
			console.log('Dude... finish the course manually!!!');
		}
	}
}

doCourse(1);
