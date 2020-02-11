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


for (var x = 1; x < 1000; x++){
 videoPlayerX.listSlidesViewedComplete[x] = true;
}

$(function(){
	var currentBtnIdx = $('#pageNoIndicator').split(' ')[0].trim();
	$(`#right_${currentBtnIdx}`).click();
});