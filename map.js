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

    Sectors are numbered from 0 at temporal retina, clockwise for left eye.

    Author: Andrew Turpin (aturpin@unimelb.edu.au)
    Date: Mon 15 Apr 2019 12:10:10 AEST
*/

    // clockwise left eye.
const g_scols_30 = ["#00008F","#0000EA","#0047FF","#00A2FF","#00FEFF","#5AFFA5", "#B5FF4A","#FFED00","#FF9200","#FF3700","#DB0000","#800000"];
const g_secs_30 = [ [-0.2618, 0.2618], [-0.7854, -0.2618], [-1.3090, -0.7854], [-1.8326, -1.3090], [-2.3562, -1.8326], [-2.8798, -2.3562], [-3.4034, -2.8798], [-3.9270, -3.4034], [-4.4506, -3.9270], [-4.9742, -4.4506], [-5.4978, -4.9742], [-6.0214, -5.4978]]; // radians
const g_scols_ted = ["#00008F","#0047FF","#00FEFF","#B5FF4A","#FF9200","#DB0000"];
const g_secs_ted = [ [-0.7853,0.7853], [-1.5707,-0.7853], [-2.3561,-1.5707], [-3.9269,-2.3561], [-4.7123,-3.9269], [-5.4977,-4.7123]]; // radians

const SECTOR_30 = 0;  // 30 degree sectors
const SECTOR_GH = 1;  // teds
var g_sector_type = SECTOR_30;
var g_scols = g_scols_30;
var g_secs = g_secs_30;

var g_exploding_sector = -1;  // sector to explode out of ONH pie
var g_highlighted_sector_in_vf = -1;  // sector to highlight in VF plot

    // ASSUMES scaleable_canvas.js has been loaded.
var g_cwidth = get_xmax();            // virtual pixels   (all scaling done relative to this)
var g_cheight = get_ymax();

const g_cx = 0.4 * g_cwidth;      // centre of VF in virtual pixels
const g_cy = g_cheight / 2 - 20;       // centre of VF in virtual pixels
const g_radius_vf_loc = 15;       // virtual pixels
const g_onh_key_radius = 110;     // virtual pixels
var   g_d2p =  9;                 // scaling factor to convert 1 degree into virtual pixels

const EYE_LEFT = 0
const EYE_RIGHT = 1

var g_eye = EYE_LEFT;
var g_onhx = -15;     // always negative!!! (left eye)
var g_onhy = 2;
var g_raphe = 174;

    // regions of the canvas
var g_regions = [];   // array of (x,y,label)  (x,y) in pixels on actual current canvas (not 'virtual')
                      // label is 0..11 for a sector for visual field points
                      // label is 100..111 for a sector on the onh key/pie
                      // and these...
const REGION_EYE       = 12;
const REGION_ONH       = 13;
const REGION_RAPHE_END = 14;
const REGION_ONHX      = 15;
const REGION_ONHY      = 16;
const REGION_PATTERN   = 17;
const REGION_SECS      = 18;
const REGION_FILE      = 19;
const REGION_HELP      = 20;
const REGION_NONE      = 21;
const REGION_DOWNLOAD  = 22;

const DRAG_NONE = 0
const DRAG_ONH = 1
const DRAG_RAPHE = 2
const DRAG_ONHX = 3
const DRAG_ONHY = 4

var g_dragging = DRAG_NONE;

var g_last_touch = [0,0];   // store the last touch for touchend event

const PATTERN_242 = 0;
const PATTERN_G = 1;
var g_pattern = PATTERN_242;

var g_img_top = new Image();
g_img_top.src = "./buttons1.png";
var g_img_bot = new Image();
g_img_bot.src = "./buttons2.png";

    // Return Euclidean distance between image_points[i1] and image_points[i2]
function distance(i1, i2) {
    dx = window.image_points[i1][0] - window.image_points[i2][0];
    dy = window.image_points[i1][1] - window.image_points[i2][1];
    return (Math.sqrt(Math.pow(dx,2) + Math.pow(dy, 2)))
}

    // Draw the visual field locations colored by sector
    // If g_highlighted_sector_in_vf > -1, then shade those points
    // pass canvas context
function draw_vf_locs(ctx) {
             // 24-2 left eye VF, right eye Retina
   var   locs =      [         [9,-21], [3,-21], [-3,-21], [-9,-21], 
                     [15,-15], [9,-15], [3,-15], [-3,-15], [-9,-15], [-15,-15], 
            [21,-9], [15, -9], [9, -9], [3, -9], [-3, -9], [-9, -9], [-15, -9], [-21,-9], 
   [27,-3], [21,-3], [15, -3], [9, -3], [3, -3], [-3, -3], [-9, -3],            [-21,-3], 
   [27, 3], [21, 3], [15,  3], [9,  3], [3,  3], [-3,  3], [-9,  3],            [-21, 3], 
            [21, 9], [15,  9], [9,  9], [3,  9], [-3,  9], [-9,  9], [-15,  9], [-21, 9], 
                     [15, 15], [9, 15], [3, 15], [-3, 15], [-9, 15], [-15, 15],
                               [9, 21], [3, 21], [-3, 21], [-9, 21]];

    if (g_pattern == PATTERN_G) {
    locs = [
                                  [  8,-26], [ -8,-26],
            [ 20,-20], [ 12,-20], [  4,-20], [ -4,-20], [-12,-20], [-20,-20],
                                  [  4,-14], [ -4,-14], 
                       [ 20,-12], [ 12,-12], [-12,-12], [-20,-12],
                       [  8, -8], [  2, -8], [ -2, -8], [ -8, -8], [-26, -8],
 [ 26, -4], [ 20, -4], [ 14, -4], [  4, -4], [ -4, -4], [-22, -4],
                       [  8, -2], [  2, -2], [ -2, -2], [ -8, -2],
                                       [  0,  0],
                       [  8,  2], [  2,  2], [ -2,  2], [ -8,  2],
 [ 26,  4], [ 20,  4], [ 14,  4], [  4,  4], [ -4,  4], [-22,  4],
                                  [  8,  8], [ -8,  8], [-26,  8],
                                  [  3,  9], [ -3,  9],
                       [ 20, 12], [ 12, 12], [-12, 12], [-20, 12],
                                  [  4, 14], [ -4, 14],
            [ 20, 20], [ 12, 20], [  4, 20], [ -4, 20], [-12, 20], [-20, 20],
                                  [  8, 26], [ -8, 26]
];
}

    const xm = g_eye == EYE_LEFT ? 1 : -1 ; 
    if (g_pattern == PATTERN_242) {
        if (g_sector_type == SECTOR_30) {
            mcols = map_cols[g_onhx + 18.0][g_onhy + 2.0][g_raphe -161];
        } else {
            mcols = map_cols_t[g_onhx + 18.0][g_onhy + 2.0][g_raphe -161];
        }
    } else {
        if (g_sector_type == SECTOR_30) {
            mcols = map_cols_G[g_onhx + 18.0][g_onhy + 2.0][g_raphe -161];
        } else {
            mcols = map_cols_G_t[g_onhx + 18.0][g_onhy + 2.0][g_raphe -161];
        }
    }

    //assert(mcols.length == locs.length);

        // draw VF
    const radius = scale(g_radius_vf_loc);
    for (var i = 0 ; i < locs.length ; i++) {
        var x = scale(g_cx + xm * locs[i][0] * g_d2p);
        var y = yscale(g_cy - locs[i][1] * g_d2p);      // note - as (0,0) is top left

        var sector = mcols[i]-1; // note -1 as javascript starts at 0
        if (g_highlighted_sector_in_vf - 100 == sector) {
            ctx.beginPath();
            ctx.fillStyle = "#cccccc";
            ctx.strokeStyle = "#cccccc";
            ctx.arc(x, y, 2*radius, 0, 2 * Math.PI, false);
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
        }
        ctx.beginPath();
        ctx.closePath();
        ctx.closePath();
        ctx.beginPath();
        ctx.strokeStyle = g_scols[sector];
        ctx.fillStyle = g_scols[sector];
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        g_regions.push([x, y, sector]);
    }
}

    // draw axes of VF and sliders for ONH x y adjustment
function draw_axes(ctx) {
    const xm = g_eye == EYE_LEFT ? 1 : -1 ; 

    const x_axis_y = g_cy +28*g_d2p;  // virtual pixels
    const y_axis_x = g_cx -35*g_d2p;  // virtual pixels
    const tick_len = 1.0 * g_d2p;     // virtual pixels

        // draw axes
    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";
    ctx.lineWidth=1;
    ctx.moveTo(scale(g_cx - 27*g_d2p), yscale(x_axis_y)); // x-axis
    ctx.lineTo(scale(g_cx + 27*g_d2p), yscale(x_axis_y));
    ctx.moveTo(scale(y_axis_x), yscale(g_cy -27*g_d2p));  // y-axis
    ctx.lineTo(scale(y_axis_x), yscale(g_cy +27*g_d2p));  

    ctx.font= scale(20) + "px Arial";
    ctx.textBaseline="middle"; 
    for (i = -27 ; i <= 27 ; i += 6) {
            // x-ticks
        const x = scale(g_cx + i*g_d2p);
        ctx.moveTo(x, yscale(x_axis_y)); 
        ctx.lineTo(x, yscale(x_axis_y + tick_len));
        ctx.textAlign = "center"; // below?
        ctx.fillText(i, x, yscale(x_axis_y + tick_len + 20/2));

            // y-ticks
        const y = yscale(g_cy + i*g_d2p);
        ctx.moveTo(scale(y_axis_x - tick_len), y);   
        ctx.lineTo(scale(y_axis_x)           , y);
        ctx.textAlign = "right";
        ctx.fillText(-i, scale(y_axis_x - tick_len), y);
    }
    ctx.stroke();

        // axis sliders
    ctx.beginPath();
    ctx.font = scale(20) + "px Arial";
    ctx.fillStyle = "purple";
    ctx.strokeStyle = "purple";
    ctx.textBaseline="middle"; 

        // draw ONHX slider 
    var tx = scale(g_cx + xm * g_onhx * g_d2p);
    var ty = yscale(x_axis_y + 4.0 * g_d2p);
    ctx.font = scale(18) + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ONH " + xm * g_onhx, tx, ty + yscale(1.0 * g_d2p));
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, yscale(x_axis_y));
    ctx.stroke();
    g_regions.push([tx, ty, REGION_ONHX]);

        // draw ONHY slider 
    tx = scale(y_axis_x - 3.0 * g_d2p);
    ty = yscale(g_cy + g_d2p * g_onhy);
    ctx.textAlign = "right";
    ctx.fillText("ONH " + g_onhy, tx, ty);
    ctx.moveTo(tx, ty);
    ctx.lineTo(scale(y_axis_x), ty);
    ctx.stroke();
    g_regions.push([tx, ty, REGION_ONHY]);

    ctx.closePath();
}

    // draw onh and raphe and fodi line
function draw_onh_and_raphe(ctx) {
    const xm = g_eye == EYE_LEFT ? 1 : -1 ; 

        // draw blind spot (onh) on VF (so y is g_cy +, not g_cy -)
    var x = scale(g_cx + xm * g_d2p * g_onhx);
    var y = yscale(g_cy + g_d2p * g_onhy);
    ctx.beginPath();
    ctx.arc(x, y, scale(1.3 * g_radius_vf_loc), 0, 2 * Math.PI, false);
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.closePath();

    ctx.font = scale(20) + "px Arial";
    ctx.textAlign = "left";
    var fodi = Math.atan2(g_onhy/180.0*Math.PI, g_onhx/180.0*Math.PI)*180/Math.PI;
    if (fodi < -20) {
        fodi = fodi + 360
    }
    fodi = (fodi - 180).toFixed(1);
    ctx.fillText("FoDi "+fodi+"\xB0", scale(g_cx - 30*g_d2p), yscale(g_cy + 23*g_d2p));

        // draw raphe on VF (so y is g_cy +, not g_cy -)
    var onhAngle = Math.atan2(g_onhy, xm * g_onhx)*180/Math.PI;
    var rAngle = onhAngle - g_raphe;
    if (g_eye == EYE_RIGHT)
         rAngle = onhAngle + g_raphe;

    raphe_end_x = scale (g_cx + 30 * g_d2p * Math.cos(rAngle/180*Math.PI));
    raphe_end_y = yscale(g_cy + 30 * g_d2p * Math.sin(rAngle/180*Math.PI));
    ctx.moveTo(scale(g_cx), yscale(g_cy));
    ctx.lineTo(raphe_end_x, raphe_end_y);
    ctx.moveTo(scale(g_cx), yscale(g_cy));      // line to onh
    ctx.lineTo(x,y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc (raphe_end_x, raphe_end_y, scale(4), 0, 2*Math.PI, true);
    ctx.fill();
    ctx.closePath();
    if (g_eye == EYE_RIGHT) {
        ctx.textAlign = "right";
    } else {
        ctx.textAlign = "left";
    }
    ctx.fillText(g_raphe+"\xB0", raphe_end_x, raphe_end_y+yscale(-12));

    g_regions.push([x, y, REGION_ONH]);
    g_regions.push([raphe_end_x, raphe_end_y, REGION_RAPHE_END]);
}

    // draw ONH key
function draw_onh_key(ctx) {

    const onh_key_radius = scale(g_onh_key_radius);
    const onh_key_x = scale(g_cx + 48 * g_d2p);
    const onh_key_y = yscale(g_cy); 

    for (i = 0 ; i < g_secs.length ; i++) {
        explode_factor = i == g_exploding_sector ? scale(10) : 0;

        var s = g_secs[i][0];
        var e = g_secs[i][1];
        if (g_eye == EYE_RIGHT) {
            s = Math.PI - s;
            e = Math.PI - e;
        }
        const theta = (s+e)/2;

        ctx.save()
        ctx.beginPath();
        ctx.scale(1, 1.3);
        const xx = onh_key_x + explode_factor*Math.cos(theta);
        const yy = onh_key_y + explode_factor*Math.sin(theta);
        ctx.arc (xx, yy/1.3, onh_key_radius, e, s, g_eye == EYE_LEFT);
        ctx.lineTo(xx,yy/1.3);
        ctx.fillStyle = g_scols[i];
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        g_regions.push([xx + onh_key_radius/2*Math.cos(theta), 
                        yy + onh_key_radius/2*Math.sin(theta), 
                        100 + i]);
    }

        // Add TSNIT annotations
    ctx.fillStyle = "black";
    if (g_eye == EYE_RIGHT) {
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
}// draw_onh_key()


    // draw sphere map for elements onhx, onhy, eye
    // nodal_prop = proportion of axial length that is nodal length (eg 17/23 mm)
function draw_canvas() {
    resize_canvas('canvasImage', window.innerWidth, window.innerHeight);

    var can = document.getElementById('canvasImage')
    var ctx = can.getContext('2d');
    ctx.clearRect(0, 0, can.width, can.height);
    //ctx.rect(0, 0, can.width, can.height);
    //ctx.stroke();

    const xm = g_eye == EYE_LEFT ? 1 : -1 ; 

    g_regions = [];  // reset regions

        // Draw OS/OD
    ctx.font = scale(30) + "px Arial";
    ctx.fillText(g_eye == EYE_LEFT ? "OS" : "OD", scale(g_cx + 28*g_d2p), yscale(g_cy - 22*g_d2p));
    //g_regions.push([scale(g_cx + 28*g_d2p), yscale(g_cy - 22*g_d2p), REGION_EYE]);

    draw_vf_locs(ctx);
    draw_axes(ctx);
    draw_onh_and_raphe(ctx);
    draw_onh_key(ctx);

    const button_left = 680+68;   // virtual coords
    const button_top_top =  35;
    const button_top_bot = 460;
    const button_height = 55;
    const button_all_w = 180;
    if (g_img_bot.complete) {
        ctx.drawImage(g_img_bot, scale(button_left), yscale(button_top_bot), dWidth=scale(button_all_w), dHeight=yscale(button_height));
    } else {
        g_img_bot.onload = function() {ctx.drawImage(g_img_bot, scale(button_left), yscale(button_top_bot), dWidth=scale(button_all_w),
dHeight=yscale(button_height));};
    }
    g_regions.push([scale(button_left +  80/580*button_all_w), yscale(button_top_bot + button_height/2), REGION_FILE]);
    g_regions.push([scale(button_left + 290/580*button_all_w), yscale(button_top_bot + button_height/2), REGION_DOWNLOAD]);
    g_regions.push([scale(button_left + 493/580*button_all_w), yscale(button_top_bot + button_height/2), REGION_HELP]);

    if (g_img_top.complete) {
        ctx.drawImage(g_img_top, scale(button_left), yscale(button_top_top), dWidth=scale(button_all_w), dHeight=yscale(button_height));
    } else {
        g_img_top.onload = function() {ctx.drawImage(g_img_top, scale(button_left), yscale(button_top_top), dWidth=scale(button_all_w),
dHeight=yscale(button_height));};
    }
    g_regions.push([scale(button_left +  90/591*button_all_w), yscale(button_top_top + button_height/2), REGION_EYE]);
    g_regions.push([scale(button_left + 295/591*button_all_w), yscale(button_top_top + button_height/2), REGION_PATTERN]);
    g_regions.push([scale(button_left + 503/591*button_all_w), yscale(button_top_top + button_height/2), REGION_SECS]);
}

window.onresize = function() { draw_canvas(); } 

window.onload = function() {
    var c = document.getElementById('canvasImage');
    c.addEventListener('click', handle_clicks, false);
    c.addEventListener('touchstart', handle_clicks, false);

    c.addEventListener('mousedown', handle_mousedown, false);
    c.addEventListener('touchmove', handle_mousemove, false);

    c.addEventListener('mouseup', handle_mouseup, false);
    c.addEventListener('touchend', handle_mouseup, false);
}

    // From (x,y) in real canvas coords. 
    // Either could be NaN, which means no change to existing.
    // Return new g_onhx,g_onhy in virtual coords.
    // And redraw
function set_new_onh(x,y) {

    var x_deg = g_onhx;
    var y_deg = g_onhy;

    if (!isNaN(x)) { x_deg = -1 * Math.abs(Math.round((unscale(x) - g_cx) / g_d2p)); }
    if (!isNaN(y)) { y_deg = Math.round((yunscale(y) - g_cy) / g_d2p);}
    
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

    var x_deg = (unscale(x) - g_cx) / g_d2p;
    var y_deg = (yunscale(y) - g_cy) / g_d2p;

    const xm = g_eye == EYE_RIGHT ? -1 : 1;
    var fo_raphe = Math.atan2(y_deg,  xm * x_deg);   // for right eye
    var fodi     = Math.atan2(-g_onhy, -g_onhx);   

    var raphe = Math.round(180 - (fo_raphe - fodi) * 180 / Math.PI);

    if (raphe < 161) raphe = 161;
    if (raphe > 181) raphe = 181;

    g_raphe = raphe;
    draw_canvas();
}

// return [x,y,label,min_distance] for event e
// min_distance is square of pixel distance in real pixels
function get_xy_from_event(e) {

    var x = 0;
    var y = 0;
    if (e.type == 'touchstart' || e.type == 'touchmove') {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

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

function check_hovers(label, min_d) {
    if (0 <= label && label < 12 && min_d <= Math.pow(scale(2 * g_radius_vf_loc),2)) {
        g_exploding_sector = label;
    } else if (label >= 100 && min_d <= Math.pow(scale(1.0 * g_onh_key_radius),2)) {
        g_highlighted_sector_in_vf = label;
    } else {
        g_exploding_sector = -1;
        g_highlighted_sector_in_vf = -1;
    }
    draw_canvas();
}

function handle_mousemove(e) {
    e.preventDefault();
    e.stopPropagation();

    const [x, y, label, min_d] = get_xy_from_event(e);

    if (g_dragging == DRAG_NONE) {
        check_hovers(label, min_d);
    } else if (g_dragging == DRAG_ONH) {
        set_new_onh(x,y);
    } else if (g_dragging == DRAG_ONHX) {
        set_new_onh(x, Number.NaN);
    } else if (g_dragging == DRAG_ONHY) {
        set_new_onh(Number.NaN, y);
    } else if (g_dragging == DRAG_RAPHE) {
        set_new_raphe(x,y);
    }
}

function check_drag(label) {
    if (label == REGION_RAPHE_END) g_dragging = DRAG_RAPHE;
    else if (label == REGION_ONH)  g_dragging = DRAG_ONH;
    else if (label == REGION_ONHX) g_dragging = DRAG_ONHX;
    else if (label == REGION_ONHY) g_dragging = DRAG_ONHY;
    else
        g_dragging = DRAG_NONE;
}

function handle_mousedown(e) {
    e.preventDefault();
    e.stopPropagation();

    const [x, y, label, min_d] = get_xy_from_event(e);
    g_last_touch = [x,y];
    check_drag(label);
}

function handle_mouseup(e) {
    e.preventDefault();
    e.stopPropagation();
    g_dragging = DRAG_NONE;
}

function handle_clicks(e) {
    const [x, y, label, min_d] = get_xy_from_event(e);

    if (label == REGION_EYE) {
        g_eye = g_eye == EYE_LEFT ? EYE_RIGHT : EYE_LEFT;
        draw_canvas();
    } 

    if (label == REGION_PATTERN) {
        g_pattern = g_pattern == PATTERN_242 ? PATTERN_G : PATTERN_242;
        draw_canvas();
    } 

    if (label == REGION_SECS) {
        g_sector_type = g_sector_type == SECTOR_30 ? SECTOR_GH : SECTOR_30;
        g_scols = g_sector_type == SECTOR_30 ? g_scols_30 : g_scols_ted;
        g_secs  = g_sector_type == SECTOR_30 ? g_secs_30 : g_secs_ted;
        draw_canvas();
    }

    if (label == REGION_HELP) {
        alert("\
You can drag the ONH, purple text, and raphe end.\n\
The Eye button switches left and right eyes.\n\
The Pattern button toggles 24-2 (HFA) and G pattern (Octopus).\n\
The Wheel button toggles Garway-Heath sectors and 30 degree sectors.\n\
The Image button allows you to derive parameters from an image file.\n\
The Download button takes you to a simple interface to get angles in a csv file.\n\
The ? button is this help.\n\n\
This is a subset of the maps generated from improvements to \
Turpin and McKendrick, Under submission Sep 2020.\n\
");
//Dennis et al., Invest Ophthalmol Vis Sci. 53(11) 2012. Pages 6981-6990. \
//The method can generate a map for any inputs or visual field patterns.\
    }

    if (label == REGION_FILE) {
        window.open("./load_file.html");
    }

    if (label == REGION_DOWNLOAD) {
        window.open("./download.html");
    }

    if (e.type == "touchstart") {
        check_hovers(label, min_d);
        check_drag(label);
    }
}
