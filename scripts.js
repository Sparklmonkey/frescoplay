let loadAnswersJson = function() {
	var oReq = new XMLHttpRequest();
	oReq.addEventListener("load", function(){
		let jsonData = JSON.parse(this.responseText);
		console.log(jsonData);
		selectCorrectAnswer(jsonData);
	});
	oReq.open("GET", "https://raw.githubusercontent.com/Sparklmonkey/frescoplay/master/test.json");
	oReq.send();
};

let selectCorrectAnswer = function(jsonTest) {
	let currentQuestion = document.getElementsByClassName('question')[0].innerText;
	let currentAnswer = "";

	for(var x = 0; x < jsonTest.questions.length; x++){
		if(currentQuestion == jsonTest.questions[x].question) {
			currentAnswer = jsonTest.questions[x].answer;
			break;
		}
	}

	console.log(currentAnswer);

	let answerOptions = document.getElementsByClassName('answerOptions')[0].children;
	let correctAnswerObject = null;

	for(var x = 0; x < answerOptions.length; x++){
		if (answerOptions[x].tagName == "LABEL") {
			if(answerOptions[x].innerText == currentAnswer) {
				correctAnswerObject = answerOptions[x].previousElementSibling;
				break;
			}
		}
	}

	if (correctAnswerObject !== null){
		correctAnswerObject.click();
	}
};

loadAnswersJson();
