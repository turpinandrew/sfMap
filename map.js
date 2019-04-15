/*
    Implements the simplified Sphere map published in 

    J. Denniss, A.M. McKendrick and A. Turpin, "An Anatomically-Customisable
    Computational Model Relating the Visual Field to the Optic Nerve
    Head in Individual Eyes", Invest Ophthalmol Vis Sci. 53(11) 2012.
    Pages 6981-6990. 
    http://www.iovs.org/content/early/2012/09/10/iovs.12-9657.abstract

    The simplified version was presented at ARVO 2019.

    Note spacing etc done in 'virtual pixels' which are relative to a canvas
    size of (get_xmax, get_ymax). These are scaled into real pixels 
    using scale() and yscale().

    Author: Andrew Turpin (aturpin@unimelb.edu.au)
    Date: Mon 15 Apr 2019 12:10:10 AEST
*/

const scols = ["#00008F","#0000EA","#0047FF","#00A2FF","#00FEFF","#5AFFA5", "#B5FF4A","#FFED00","#FF9200","#FF3700","#DB0000","#800000"];

var g_exploding_sector = -1;  // sector to explode out of ONH pie

var g_cwidth = get_xmax();            // virtual pixels   (all scaling done relative to this)
var g_cheight = get_ymax();

const g_axis_width = 100;               // virtual pixels
const g_d2p = 10;  // scaling factor to convert 1 degree into virtual pixels
const g_radius_vf_loc = 15;   // virtual pixels

const EYE_LEFT = 0
const EYE_RIGHT = 1

var g_eye = EYE_LEFT;
var g_onhx = -15;     // always negative!!! (left eye)
var g_onhy = 2;
var g_raphe = 174;

var g_regions = [];   // array of (x,y,label)  (x,y) in pixels on actual current canvas (not 'virtual')
                      // label is 0..11 for a sector, and then these
const REGION_EYE       = 12;
const REGION_ONH       = 13;
const REGION_RAPHE_END = 14;
const REGION_ONHX      = 15;
const REGION_ONHY      = 16;

const DRAG_NONE = 0
const DRAG_ONH = 1
const DRAG_RAPHE = 2
const DRAG_ONHX = 3
const DRAG_ONHY = 4

var g_dragging = DRAG_NONE;

    // Return Euclidean distance between image_points[i1] and image_points[i2]
function distance(i1, i2) {
    dx = window.image_points[i1][0] - window.image_points[i2][0];
    dy = window.image_points[i1][1] - window.image_points[i2][1];
    return (Math.sqrt(Math.pow(dx,2) + Math.pow(dy, 2)))
}

    // return centre of VF in virtual coords, not actual scaled coords
function get_centre_of_VF() {
    return [g_axis_width + 30*g_d2p + g_radius_vf_loc , g_cheight / 2 - g_axis_width/2]; 
}

    // draw sphere map for elements onhx, onhy, eye
    // nodal_prop = proportion of axial length that is nodal length (eg 17/23 mm)
function draw_canvas() {
    resize_canvas('canvasImage', window.innerWidth, window.innerHeight);

             // for drawing the map
   const tfd2_locs = [         [9,-21], [3,-21], [-3,-21], [-9,-21], 
                     [15,-15], [9,-15], [3,-15], [-3,-15], [-9,-15], [-15,-15], 
            [21,-9], [15, -9], [9, -9], [3, -9], [-3, -9], [-9, -9], [-15, -9], [-21,-9], 
   [27,-3], [21,-3], [15, -3], [9, -3], [3, -3], [-3, -3], [-9, -3],            [-21,-3], 
   [27, 3], [21, 3], [15,  3], [9,  3], [3,  3], [-3,  3], [-9,  3],            [-21, 3], 
            [21, 9], [15,  9], [9,  9], [3,  9], [-3,  9], [-9,  9], [-15,  9], [-21, 9], 
                     [15, 15], [9, 15], [3, 15], [-3, 15], [-9, 15], [-15, 15],
                               [9, 21], [3, 21], [-3, 21], [-9, 21]];


    var can = document.getElementById('canvasImage')
    var ctx = can.getContext('2d');
    ctx.clearRect(0, 0, can.width, can.height);
    ctx.rect(0, 0, can.width, can.height);
    ctx.stroke();

    const xm = g_eye == EYE_RIGHT ? 1 : -1 ; 
    const mcols = map_cols[g_onhx + 18.0][g_onhy + 2.0][g_raphe -161];
    const [cx, cy] = get_centre_of_VF();

    g_regions = [];  // reset regions

        // draw VF
    const radius = scale(g_radius_vf_loc);
    for (i = 0 ; i < tfd2_locs.length ; i++) {
        var x = scale(cx + xm * tfd2_locs[i][0] * g_d2p);
        var y = yscale(cy - tfd2_locs[i][1] * g_d2p);      // note - as (0,0) is top left
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = scols[mcols[i]-1]; // note -1 as javascript starts at 0
        ctx.fill();

        g_regions.push([x, y, mcols[i]-1]);
    }

        // draw axes
    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "black";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(scale(cx - 27*g_d2p), yscale(cy +25*g_d2p)); // x-axis
    ctx.lineTo(scale(cx + 27*g_d2p), yscale(cy +25*g_d2p));
    ctx.moveTo(scale(g_axis_width), yscale(cy -21*g_d2p));  // y-axis
    ctx.lineTo(scale(g_axis_width), yscale(cy +21*g_d2p));
    ctx.font= scale(20) + "px Arial";
    ctx.textBaseline="middle"; 
    for (i = -27 ; i <= 27 ; i += 6) {
        ctx.moveTo(scale(cx + i*g_d2p), yscale(cy +25*g_d2p)); // x-ticks
        ctx.lineTo(scale(cx + i*g_d2p), yscale(cy +26*g_d2p));
        ctx.textAlign = "center";
        ctx.fillText(i, scale(cx + i*g_d2p), yscale(cy + 27.3*g_d2p));

        if (Math.abs(i) <= 21) {  // y-ticks
            ctx.moveTo(scale(g_axis_width),     yscale(cy + i*g_d2p));
            ctx.lineTo(scale(g_axis_width/1.2), yscale(cy + i*g_d2p));
            ctx.textAlign = "right";
            ctx.fillText(-i, scale(g_axis_width/1.2), yscale(cy + i*g_d2p));
        }
    }
    ctx.stroke();

        // draw ONHX slider 
    ctx.font = scale(20) + "px Arial";
    ctx.fillStyle = "purple";
    ctx.strokeStyle = "purple";
    ctx.textBaseline="middle"; 
    const tx = scale(cx + xm * g_onhx * g_d2p);
    const ty = yscale(g_cheight - g_axis_width/3);
    ctx.fillText("ONH " + xm * g_onhx, tx, ty);
    ctx.moveTo(tx, yscale(g_cheight - g_axis_width/2));
    ctx.lineTo(tx, yscale(g_cheight - g_axis_width));
    ctx.stroke();
    ctx.strokeStyle = "black";
    g_regions.push([tx, ty, REGION_ONHX]);

        // draw ONHY slider 
    ctx.font = scale(20) + "px Arial";
    ctx.fillStyle = "purple";
    ctx.strokeStyle = "purple";
    ctx.textBaseline="middle"; 
    const ttx = scale(33);
    const tty = yscale(cy + g_d2p * g_onhy);
    ctx.fillText("ONH " + g_onhy, ttx, tty);
    ctx.moveTo(scale(33 + 30), tty);
    ctx.lineTo(scale(g_axis_width * 1.1), tty);
    ctx.stroke();
    ctx.strokeStyle = "black";
    g_regions.push([ttx, tty, REGION_ONHY]);

        // draw blind spot (onh) on VF (so y is cy +, not cy -)
    var x = scale(cx + xm * g_d2p * g_onhx);
    var y = yscale(cy + g_d2p * g_onhy);
    ctx.beginPath();
    ctx.arc(x, y, scale(1.3 * g_radius_vf_loc), 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();

        // draw raphe on VF (so y is cy +, not cy -)
    var onhAngle = Math.atan2(g_onhy, xm * g_onhx)*180/Math.PI;
    var rAngle = onhAngle - g_raphe;
    if (g_eye == EYE_LEFT)
         rAngle = onhAngle + g_raphe;

    raphe_end_x = scale (cx + 30 * g_d2p * Math.cos(rAngle/180*Math.PI));
    raphe_end_y = yscale(cy + 30 * g_d2p * Math.sin(rAngle/180*Math.PI));
    ctx.beginPath();
    ctx.moveTo(scale(cx), yscale(cy));
    ctx.lineTo(raphe_end_x, raphe_end_y);
    ctx.moveTo(scale(cx), yscale(cy));      // line to onh
    ctx.lineTo(x,y);
    ctx.stroke();

    g_regions.push([x, y, REGION_ONH]);
    g_regions.push([raphe_end_x, raphe_end_y, REGION_RAPHE_END]);

        // draw ONH key
    const onh_key_radius = scale(35 * g_d2p/3); // pixels
    const onh_key_x = scale(g_axis_width + g_cwidth * 12 / 16);
    const onh_key_y = yscale(cy); 

    for (i = 0 ; i < scols.length ; i++) {
        explode_factor = i == g_exploding_sector ? scale(10) : 0;

        if (g_eye == EYE_RIGHT)
            s = (-15 - i*30)/180*Math.PI;
        else
            s = (180 - 15 + i*30)/180*Math.PI;

        ctx.save()
        ctx.beginPath();
        ctx.scale(1, 1.3);
        var theta = (g_eye == EYE_LEFT ? (180 - i*30) : i*30) / 180*Math.PI;
        var xx = onh_key_x + explode_factor*Math.cos(theta);
        var yy = onh_key_y - explode_factor*Math.sin(theta);
        ctx.arc (xx, yy/1.3, onh_key_radius, s+30/180*Math.PI, s, true);
        ctx.lineTo(xx,yy/1.3);
        ctx.fillStyle = scols[i];
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = "black";
    if (g_eye == EYE_LEFT) {
        ctx.textAlign = "right";
        ctx.fillText("N", onh_key_x + onh_key_radius, onh_key_y);
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.fillText(" T", onh_key_x - onh_key_radius, onh_key_y);
    } else {
        ctx.textAlign = "left";
        ctx.fillText("N", onh_key_x - onh_key_radius, onh_key_y);
        ctx.fillStyle = "white";
        ctx.textAlign = "right";
        ctx.fillText("T ", onh_key_x + onh_key_radius, onh_key_y);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.textBaseline="top"; 
    ctx.fillText("S" , onh_key_x, onh_key_y - 1.3*onh_key_radius);
    ctx.textBaseline="bottom"; 
    ctx.fillText("I", onh_key_x, onh_key_y + 1.3*onh_key_radius);

        // draw Eye Label Region
    ctx.textBaseline="middle"; 
    ctx.font = scale(40) + "px Arial";
    ctx.fillText(g_eye == EYE_LEFT ? "OS" : "OD" , scale(g_axis_width + 50), yscale(50));
    g_regions.push([scale(100), yscale(50), REGION_EYE]);

        // draw params
    ctx.textBaseline="middle"; 
    ctx.font = scale(20) + "px Arial";
    ss = "ONH = (" + g_onhx * (g_eye == EYE_RIGHT ? -1 : 1) + ", " + g_onhy + ")";
    ctx.fillText(ss, scale(g_cwidth - 160), yscale(g_cheight - 50));
    ss = "DiFoRaphe = " + g_raphe;
    ctx.fillText(ss, scale(g_cwidth - 200), yscale(g_cheight - 20));
}

window.onresize = function() { draw_canvas(); } 

window.onload = function() {
    var c = document.getElementById('canvasImage');
    c.addEventListener('click', handle_clicks, false);
    c.addEventListener('mousedown', handle_mousedown, false);
    c.addEventListener('mouseup', handle_mouseup, false);
}

    // From (x,y) in real canvas coords, get new g_onhx,g_onhy in virtual coords.
    // And redraw
function set_new_onh(x,y) {
    const [cx,cy] = get_centre_of_VF();

    var x_deg = Math.round((unscale(x) - cx) / g_d2p);
    var y_deg = Math.round((yunscale(y) - cy) / g_d2p);
    
    x_deg = -1 * Math.abs(x_deg);
    if (x_deg < -18) x_deg = -18;
    if (x_deg > -12) x_deg = -12;
    
    if (y_deg < -2) y_deg = -2;
    if (y_deg >  4) y_deg =  4;
    
    g_onhx = x_deg;
    g_onhy = y_deg;
    draw_canvas();
}

    // from (x,y) in real canvas coords, get new g_raphe.
    // And redraw
function set_new_raphe(x,y) {
    const [cx,cy] = get_centre_of_VF();

    var x_deg = (unscale(x) - cx) / g_d2p;
    var y_deg = (yunscale(y) - cy) / g_d2p;

    const xm = g_eye == EYE_LEFT ? -1 : 1;
    var fo_raphe = Math.atan2(y_deg,  xm * x_deg);   // for right eye
    var fodi     = Math.atan2(-g_onhy, -g_onhx);   

    var raphe = Math.round(180 - (fo_raphe - fodi) * 180 / Math.PI);

    if (raphe < 161) raphe = 161;
    if (raphe > 181) raphe = 181;

    g_raphe = raphe;
    draw_canvas();
}

// return [x,y,label,min_distance] for event e
function get_xy_from_event(e) {
    var x = e.clientX;
    var y = e.clientY;
    var can = document.getElementById('canvasImage');
    var rect = can.getBoundingClientRect();
    x = x/rect.width * can.width;
    y = y/rect.height * can.height;

    min_i = -1;
    min_d = g_cwidth * g_cwidth * g_cheight;
    for(var i = 0; i < g_regions.length; i++) {
        dist = Math.pow(x - g_regions[i][0],2) + Math.pow(y - g_regions[i][1],2);
        if (dist < min_d) {
            min_d = dist;
            min_i = i;
        }
    }

    return [x, y, g_regions[min_i][2], min_d];
}

function handle_mousemove(e) {
    const [x, y, label, min_d] = get_xy_from_event(e);

    if (g_dragging == DRAG_NONE) {
        if (0 <= label && label < 12 && min_d <= Math.pow(scale(g_radius_vf_loc),2)) {
            g_exploding_sector = label;
        } else {
            g_exploding_sector = -1;
        }
        draw_canvas();
    } else if (g_dragging == DRAG_ONH) {
        set_new_onh(x,y);
    } else if (g_dragging == DRAG_ONHX) {
        set_new_onh(x, yscale(g_onhy));
    } else if (g_dragging == DRAG_ONHY) {
        set_new_onh(scale(g_onhx), y);
    } else if (g_dragging == DRAG_RAPHE) {
        set_new_raphe(x,y);
    }
}

function handle_mousedown(e) {
    const [x, y, label, min_d] = get_xy_from_event(e);

    if (label == REGION_RAPHE_END) g_dragging = DRAG_RAPHE;
    else if (label == REGION_ONH)  g_dragging = DRAG_ONH;
    else if (label == REGION_ONHX) g_dragging = DRAG_ONHX;
    else if (label == REGION_ONHY) g_dragging = DRAG_ONHY;
    else
        g_dragging = DRAG_NONE;
}

function handle_mouseup(e) {
    const [x, y, label, min_d] = get_xy_from_event(e);

    if (g_dragging == DRAG_ONH) {
        set_new_onh(x,y);
    } else if (g_dragging == DRAG_ONHX) {
        set_new_onh(x, yscale(g_onhy));
    } else if (g_dragging == DRAG_ONHY) {
        set_new_onh(scale(g_onhx), y);
    } else if (g_dragging == DRAG_RAPHE) {
        set_new_raphe(x, y);
    }
    g_dragging = DRAG_NONE;
}

function handle_clicks(e) {
    const [x, y, label, min_d] = get_xy_from_event(e);

    if (label == REGION_EYE) {
        g_eye = g_eye == EYE_LEFT ? EYE_RIGHT : EYE_LEFT;
        draw_canvas();
    } 
}
