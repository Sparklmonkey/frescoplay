let response = undefined

let loadAnswersJson = function() {
	let urlArray = document.URL.split('/');
	let quizId = urlArray[urlArray.length - 2];
	// fetch(`https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/${quizId}.json`)
	fetch(`https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/test.json`)
		.then( response => response.json())
		.then( responseObject => {
			response = responseObject
			selectCorrectAnswer();
		})
}

let selectCorrectAnswer = function() {
	
	let currQuestion = document.getElementsByClassName('question')[0].innerText;
	
	try {
		// Might throw null pointer
		var currAnswer = response.questions.find( it => it.question == currQuestion ).answer;
		
		let answerOptions = Array.from(document.getElementsByClassName('answerOptions')[0].children);

		// Might throw null pointer (CURRENTLY NOT WORKING)
		let correctAnswerObject = answerOptions.find( it => it.tagName == "LABEL" && it.innerText == currAnswer).previousElementSibling
		correctAnswerObject.click();
	} catch (error) {
		console.log("No answers for this")
	}

}

// THIS WILL HANDLE CALLING QUESTION COMPLETION AFTER QUESTION HAS BEEN AUTOMATICALLY SELECTED, OR MANUALLY SELECTED.
Array.from(document.querySelectorAll(".navButton.right, .answerOptions")).map( it => {
	it.addEventListener("click", (event) => {
		if(response)
			setTimeout(() => selectCorrectAnswer(), 1500)
		else
			loadAnswersJson()
	})
})

loadAnswersJson();
