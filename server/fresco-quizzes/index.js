//requiring path and fs modules
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
const express = require('express');
const app = express();
const fetch = require("node-fetch");


const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

//joining path of directory 
const directoryPath = path.join(__dirname, 'fresco');
const directoryResultPath = path.join(__dirname, 'fresco/quizzes');

//passsing directoryPath and callback function
fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    
    let nonJunklist = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

    asyncForEach(nonJunklist, async (file) => {
    	try {
			// Do whatever you want to do with the file     
	        let fileName = file.replace('.txt', '');  

	        console.log(fileName); 

	        await doCourseSearch(fileName, async (jsonData) => {
	        	const cpFileDir = `${directoryPath}/quizes/tmp_${jsonData.nodes[0].id}.json`;
	        	// destination.txt will be created or overwritten by default.
				await fs.copyFile(`${directoryPath}/${file}`, cpFileDir, async (err) => {
				  if (err) {
				  	throw err;
				  }

				  console.log(`${file} was copied to ${cpFileDir}`);

				  await formatQuizAnswers(cpFileDir, async (formattedData) => {
				  	const fnFileDir = `${directoryPath}/quizes/${jsonData.nodes[0].id}.json`;
				  	fs.writeFile(fnFileDir, formattedData, function(err) {
					    if(err) {
					        return console.log(err);
					    }
					    console.log(`The quiz was saved as ${fnFileDir}!`);
					}); 
				  });
				});        	
	        });

	        await waitFor(2000);	        
	    } catch(error){
	    	console.log(`Oopss... there was a really weird behavior trying to handle this file ${file}.`);
	    	console.error(error);
	    }
    });
});

const doCourseSearch = async (courseName, callback) => {
  try {
  	const queryOptions = querystring.stringify({
		'search_term': courseName,
		'type' : 'Node'
	});
  	const url = `https://play-api.fresco.me/api/v1/search.json?${queryOptions}`;
    const response = await fetch(url, {
    	method: 'GET',
    	headers : {
    		'x-api-key': 'ILyDWbj_iOnNi_2L-0YX8iHmyibPROw9YcPHj37j7FU'
    	}
    });
    const json = await response.json();
    callback(json);
  } catch (error) {
    console.log(error);
  }
};

const formatQuizAnswers = async (file, callback) => {
	try {
		await fs.readFile(file, 'utf8', async (err, contents) => {			
		    let splittedLines = contents.split('*');
		    let formattedData = {
		    	questions: []
		    };
		    await asyncForEach(splittedLines, async (question) => {			
		    	if (question.trim() !== '') {	
			    	let questionAndAnswer = question.split("\n");
			    	console.log(questionAndAnswer);

			    	if (questionAndAnswer.length > 0) {
				    	// element at position 1 should be the question
				    	// element at position 2 should be the answer
				    	let question = questionAndAnswer[0].trim();
				    	let answer = questionAndAnswer.length > 1 ? questionAndAnswer[1] : ''; 

				    	formattedData.questions.push({
				    		question : question,
				    		answer : answer
				    	});
			    	}
			    }
		    });
		    
		    callback(JSON.stringify(formattedData));
		});
	} catch (error) {
		console.log(error);
	}
};

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});