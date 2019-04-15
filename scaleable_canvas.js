// -----------------------------------------------------
// Scaleable Canvas
// Author: Stephen Poley
// https://sbpoley.home.xs4all.nl/webmatters/scaleable_canvas.js
//
// Altered by Andrew Turpin a little.
// -----------------------------------------------------

var msg_unitialised = 'Canvas not initialised: call resize_canvas first';
const glb_x_max = 1000;
const glb_y_max = 588;

var glb_canvas_width = 0;
var glb_canvas_height = 0;
var glb_aspect_ratio = glb_x_max / glb_y_max;

function get_xmax() { return glb_x_max; }
function get_ymax() { return glb_y_max; }

// -----------------------------------------------------
// Scale canvas element canvas_id to have same width as element
// match_id, and height = width/aspect.
// -----------------------------------------------------
function resize_canvas(canvas_id, newWidth, newHeight) {	
	var cv_element = document.getElementById(canvas_id);	
	glb_canvas_width = Math.min(newWidth, newHeight * glb_aspect_ratio);
	glb_canvas_height = Math.round(glb_canvas_width / glb_aspect_ratio);
	glb_aspect_ratio = glb_canvas_width / glb_canvas_height; // NB: may differ slightly from aspect parameter due to rounding

	cv_element.width = glb_canvas_width;
	cv_element.height = glb_canvas_height;  

    var ctx = cv_element.getContext('2d');
    ctx.width = glb_canvas_width;
    ctx.height = glb_canvas_height;

	return true;   
}

// -----------------------------------------------------
// Scaling routines
// -----------------------------------------------------

function scale(pos) {	
	return Math.round(pos/glb_x_max*glb_canvas_width);
    if (glb_canvas_width==0)
	{ 	alert(msg_unitialised);
		return false;
	}
}

function unscale(pos) {	return Math.round(pos*glb_x_max/glb_canvas_width); }

// use for 1px lines
function midpx_scale(pos)
{	if (glb_canvas_width==0)
	{ 	alert(msg_unitialised);
		return false;
	}
	return Math.round(pos/glb_x_max*glb_canvas_width-0.5)+0.5;
}


function yscale(pos) {
	return Math.round(pos/glb_y_max*glb_canvas_width/glb_aspect_ratio);
	if (glb_canvas_width==0)
	{ 	alert(msg_unitialised);
		return false;
	}
}

function yunscale(pos) {
	return Math.round(pos*glb_y_max/glb_canvas_width*glb_aspect_ratio);
}

function midpx_yscale(pos)
{	if (glb_canvas_width==0)
	{ 	alert(msg_unitialised);
		return false;
	}
	return Math.round(pos/glb_x_max*glb_canvas_width/glb_aspect_ratio-0.5)+0.5;
}
