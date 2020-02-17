//requiring path and fs modules
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
const express = require('express');
const app = express();
const fetch = require("node-fetch");
const frescoApiKey = 'PHbw3n0nLCr94o4BLFe-lmvtCx7Z1vshq9keQQPhsmY';
const chuniApiKey = 'fr3sc0-5uck5'

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

//joining path of directory 
const directoryPath = path.join(__dirname, 'fresco');
const directoryResultPath = path.join(__dirname, 'quizzes');

//passsing directoryPath and callback function
fs.readdir(directoryPath, async (err, files) => {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    
    let nonJunklist = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));	

    await asyncForEach(nonJunklist, async (file) => {
    	try {
			// Do whatever you want to do with the file     
	        let fileName = file.replace('.txt', '');  	        
	        console.log(fileName); 

	        await doCourseSearch(fileName, async (jsonData) => {						
				await formatQuizAnswers(jsonData.nodes[0].id, `${directoryPath}/${file}`, async courseData => {															
					console.log(courseData)

					await insertCourseIntoApi(courseData, 
						data => console.log(`Quiz ${jsonData.id} insert response: ${data}`));					
				});     	
	        });

	        await waitFor(2000);	        
	    } catch(error){
	    	console.log(`Oopss... there was a really weird behavior trying to handle this file ${file}.`);
	    	console.error(error);
	    }
	});
	    
    console.log('Process Finished :)');
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
			'x-api-key': frescoApiKey			
    	}
    });
    const json = await response.json();
    callback(json);
  } catch (error) {
    console.log(`Error trying to do the course search. Details: ${error.message}`);
  }
};

const insertCourseIntoApi = async (courseData, callback) => {
	try {	  
	  const bodyData = JSON.stringify(courseData)
	  console.log(bodyData)

	  const url = 'https://quiz-store.herokuapp.com/quiz/post';
	  const response = await fetch(url, {
		  method: 'POST',
		  headers : {
			  'x-api-key': chuniApiKey,
			  'Content-Type': 'application/json'
		  },
		  body: bodyData
	  });

	  console.log(response);

	  let responseData = '';
	  if (response.status === 204)
		  responseData = 'OK'
	  else
		  responseData = 'ERROR';
		  
	  callback(responseData);
	} catch (error) {
	  console.log(`Error trying to insert the data. Details: ${error.message}`);
	}
  };

const formatQuizAnswers = async (id, file, callback) => {
	try {
		await fs.readFile(file, 'utf8', async (err, contents) => {		
			if (err) console.log(`Error trying to read the following file: ${file}. Details: ${err.message}`);			
			
		    let splittedLines = contents.split('*');
		    let questions = []		    
		    await asyncForEach(splittedLines, async (question) => {			
		    	if (question.trim() !== '') {	
			    	let questionAndAnswer = question.split("\n");			    	

			    	if (questionAndAnswer.length > 0) {
				    	// element at position 1 should be the question
				    	// element at position 2 should be the answer
				    	let question = questionAndAnswer[0].trim();
				    	let answer = questionAndAnswer.length > 1 ? questionAndAnswer[1] : ''; 

				    	questions.push({
				    		question : question,
				    		answer : answer
				    	});
			    	}
			    }
			});
			
			const courseData = {		
				id: id,
				questions: questions				
			}
		    
		    callback(courseData);
		});
	} catch (error) {
		console.log(error);
	}
};

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});