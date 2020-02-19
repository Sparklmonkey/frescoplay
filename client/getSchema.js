const apiKey = window.localStorage.getItem('playWebApp.api_key');

const getCourseSchema = (courseId) => {
	let courseSchema = { 
	    id : courseId,
		quizzes: []
	};
	
    fetch(`https://play-api.fresco.me/api/v1/nodes/${courseId}.json?source=play`, {
        headers: { 'x-api-key' : apiKey }
    })
    .then(response => response.text())
    .then(responseText => {
    	const courseData = JSON.parse(responseText);    	
        courseData.tasks.forEach((item, idx) => {
        	const isAssessment = item.task_type == 'assessment'; 
            getTaskDetails(courseSchema, item, isAssessment, () => {
            	if(idx == courseData.tasks.length - 1){
	            	console.log(JSON.stringify(courseSchema))
	            }
            });            
        });
	});	
}

const getTaskDetails = (courseSchema, task, assessment, callback) => {
	fetch(`https://play-api.fresco.me/api/v1/tasks/${task.id}.json?source=play`, {
        headers: { 'x-api-key' : apiKey }
    })
    .then(response => response.text())
    .then(responseText => {
    	const taskData = JSON.parse(responseText);
        taskData.contents.forEach((item, idx) => {
        	if(item.content_type === 'quiz'){
        		courseSchema.quizzes.push({
        			'type': assessment ? 'assessment' : 'quiz',
        			'id': item.id
        		})

        		if(idx == taskData.contents.length - 1){
        			callback();
        		}
    		}      	
        });
	});	
}

const iVolveScript = () => {
	var xInterval = setInterval(function(){
		$(document).ready(function(){
			if($('.endQuizCls').length > 0) {
				exitCourse();
				clearInterval(xInterval);
			} else {
				videoEnded();
				setTimeout(function(){
				 $('#nextBtn').click();
				}, 1000);
			}
		});
	}, 5000);
}

// // Cursos Flash
// for (var x = 1; x < 1000; x++){
// 	videoPlayerX.listSlidesViewedComplete[x] = true;
//    }