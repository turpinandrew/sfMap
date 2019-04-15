/*
    Implements the simplified Sphere map published in 

    J. Denniss, A.M. McKendrick and A. Turpin, "An Anatomically-Customisable
    Computational Model Relating the Visual Field to the Optic Nerve
    Head in Individual Eyes", Invest Ophthalmol Vis Sci. 53(11) 2012.
    Pages 6981-6990. 
    http://www.iovs.org/content/early/2012/09/10/iovs.12-9657.abstract

    The simplified version was (hopefully) presented at ARVO 2019.

    Author: Andrew Turpin (aturpin@unimelb.edu.au)
    Date: Mon 26 Nov 2018 06:39:31 AEDT
*/

const scols = ["#00008F","#0000EA","#0047FF","#00A2FF","#00FEFF","#5AFFA5", "#B5FF4A","#FFED00","#FF9200","#FF3700","#DB0000","#800000"];

const spectralis_ring_diameter = 3.5; // mm  - for clicking

    // stored when clicking on image canvas
var image_points = [ [-1, -1], [-1,-1],  [-1,-1]];
var image_points_index = 0;

const STATE_BUTTON = 0;   // clicking first 2 buttons
const STATE_IMAGE  = 1;   // clicking Spectralis image
const STATE_MAP    = 2;   // clicking map
var state = STATE_BUTTON;

var exploding_sector = -1;  // sector to explode out of ONH pie

const EYE_BUTTON_LEFT = "Left. Change to Right";
const EYE_BUTTON_RIGHT = "Right. Change to Left";

    // Return Euclidean distance between image_points[i1] and image_points[i2]
function distance(i1, i2) {
    dx = window.image_points[i1][0] - window.image_points[i2][0];
    dy = window.image_points[i1][1] - window.image_points[i2][1];
    return (Math.sqrt(Math.pow(dx,2) + Math.pow(dy, 2)))
}

    // draw sphere map for elements onhx, onhy, eye
    // nodal_prop = proportion of axial length that is nodal length (eg 17/23 mm)
function show_map() {
             // for drawing the map
         const tfd2_locs = [     [9,-21], [3,-21], [-3,-21], [-9,-21], 
                     [15,-15], [9,-15], [3,-15], [-3,-15], [-9,-15], [-15,-15], 
            [21,-9], [15, -9], [9, -9], [3, -9], [-3, -9], [-9, -9], [-15, -9], [-21,-9], 
   [27,-3], [21,-3], [15, -3], [9, -3], [3, -3], [-3, -3], [-9, -3],            [-21,-3], 
   [27, 3], [21, 3], [15,  3], [9,  3], [3,  3], [-3,  3], [-9,  3],            [-21, 3], 
            [21, 9], [15,  9], [9,  9], [3,  9], [-3,  9], [-9,  9], [-15,  9], [-21, 9], 
                     [15, 15], [9, 15], [3, 15], [-3, 15], [-9, 15], [-15, 15],
                               [9, 21], [3, 21], [-3, 21], [-9, 21]];

    const y_axis_width = 50; // pixels

    var can = document.getElementById('canvasImage')
    var ctx = can.getContext('2d');
    ctx.clearRect(0, 0, can.width, can.height);

    const scale = can.width/300 * 3;
    const radius = 9 * scale/5;
    const xm = document.getElementById("eye").value == EYE_BUTTON_RIGHT ? 1 : -1 ; // note opposite button text, right=-1
    const [cx, cy] = [y_axis_width + (2 * 30 * scale) /2, can.height/2]; 

    var els = ["onhx", "onhy", "raphe"];
    for (var i = 0; i < els.length; i++) {
        const s = els[i];
        const min = Number(document.getElementById(s).min);
        const max = Number(document.getElementById(s).max);
        const val = Number(document.getElementById(s).value);
        if (val > max) document.getElementById(s).value = max;
        if (val < min) document.getElementById(s).value = min;
    }

    const onhx = xm * document.getElementById("onhx").value; //(always negative)
    const onhy = document.getElementById("onhy").value;
    const raphe = document.getElementById("raphe").value;
    const mcols = map_cols[Number(onhx) + 18.0][Number(onhy) + 2.0][Number(raphe) -161];

    for (i = 0 ; i < tfd2_locs.length ; i++) {
        var x = cx + xm * tfd2_locs[i][0] * scale;
        var y = cy - tfd2_locs[i][1] * scale;   // note - as (0,0) is top left
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = scols[mcols[i]-1]; // note -1 as javascript starts at 0
        ctx.fill();
    }

        // draw blind spot (onh) on VF (so y is cy +, not cy -)
    var x = cx + scale * document.getElementById('onhx').value;
    var y = cy + scale * document.getElementById('onhy').value;
    ctx.beginPath();
    ctx.arc(x, y, 1.3*radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();

        // draw raphe on VF (so y is cy +, not cy -)
    var onhAngle = Math.atan2(onhy, xm*onhx)*180/Math.PI;
    var onhDist = Math.sqrt(Math.pow(x - cy,2) + Math.pow(y-cx,2));
    var rAngle = onhAngle - Number(raphe);
    if (xm == -1)
         rAngle = onhAngle + Number(raphe);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 30*scale*Math.cos(rAngle/180*Math.PI), cy + 30*scale*Math.sin(rAngle/180*Math.PI));
    ctx.moveTo(cx, cy);
    ctx.lineTo(x,y);
    ctx.stroke();

        // draw axes
    ctx.font="20px Arial";
    ctx.beginPath();
    ctx.moveTo(cx - 27*scale, cy +25*scale); // x-axis
    ctx.lineTo(cx + 27*scale, cy +25*scale);
    ctx.moveTo(y_axis_width, cy -21*scale);  // y-axis
    ctx.lineTo(y_axis_width, cy +21*scale);
    ctx.lineWidth=1;
    ctx.textBaseline="middle"; 
    for (i = -27 ; i <= 27 ; i += 6) {
        ctx.moveTo(cx + i*scale, cy +25*scale); // x-ticks
        ctx.lineTo(cx + i*scale, cy +26*scale);
        ctx.textAlign = "center";
        ctx.fillText(i, cx + i*scale, cy + 27.2*scale);

        if (Math.abs(i) <= 21) {  // y-ticks
            ctx.moveTo(y_axis_width,   cy + i*scale);
            ctx.lineTo(y_axis_width/1.2, cy + i*scale);
            ctx.textAlign = "right";
            ctx.fillText(i, y_axis_width/1.2, cy + i*scale);
        }
    }
    ctx.stroke();

        // draw ONH key
    const onh_key_radius = 35 * scale/3; // pixels
    const onh_key_x = cx + (32 * scale) + onh_key_radius;
    const onh_key_y = cy; // can.height/2;
    for (i = 0 ; i < scols.length ; i++) {
        explode_factor = i == exploding_sector ? 10 : 0;

        if (xm == 1)
            s = (-15 - i*30)/180*Math.PI;
        else
            s = (180 - 15 + i*30)/180*Math.PI;

        ctx.save()
        ctx.beginPath();
        ctx.scale(1, 1.3);
        var theta = (xm == -1 ? (180 - i*30) : i*30) / 180*Math.PI;
        var xx = onh_key_x + explode_factor*Math.cos(theta);
        var yy = onh_key_y - explode_factor*Math.sin(theta);
        ctx.arc (xx, yy/1.3, onh_key_radius, s+30/180*Math.PI, s, true);
        ctx.lineTo(xx,yy/1.3);
        ctx.fillStyle = scols[i];
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = "black";
    if (xm == -1) {
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
    ctx.textBaseline="bottom"; 
    ctx.fillStyle = "black";
    ctx.fillText("S" , onh_key_x, onh_key_y - 1.3*onh_key_radius);
    ctx.textBaseline="top"; 
    ctx.fillText("I", onh_key_x, onh_key_y + 1.3*onh_key_radius);

    state = STATE_MAP;
}

    // convert mm on retina to degrees of VF (from nodal point)
function toVF(mm_on_ret) {
    var p = 17/22.6;
    var nd = 11.459 * 2.0 * p;
    return (Math.atan2(mm_on_ret, nd) * 180.0 / Math.PI);
}

function show_hide_buttons() {
    document.getElementById('buttons').style.display = "inline-block";
    //document.getElementById('button_default').style.display = "none";
    //document.getElementById('input_file').style.display = "none";
    //document.getElementById('button_file').style.display = "none";
    document.getElementById('start_buttons').style.display = "none";
}

    // Show default map
function default_map() {
    document.getElementById('onhx').value = -15;
    document.getElementById('onhy').value = 2;

    if (document.getElementById('eye').value == EYE_BUTTON_LEFT) // set left eye
        toggle_eye();
    else {
        show_map();
    }
    show_hide_buttons();
}

    // load image file into canvas
function handleFiles(e) {
    var can1 = document.getElementById('canvasImage');
    var ctx1 = can1.getContext('2d');
    var image=new Image();
    image.onload=function() { ctx1.drawImage(image,0,0, 800,600); }
    image.src=URL.createObjectURL(e.target.files[0])

    state = STATE_IMAGE;
    image_points_index = 0;  // reset the image_points_index
    show_hide_buttons();
}

    // if v is outside of [min, max] of element_id, set it to the bound
function check_bounds(v, element_id) {
    var e = document.getElementById(element_id);
    if (v < e.min)
        v = e.min;
    else if (v > e.max)
        v = e.max;

    return (v);
}

function handle_clicks_on_image(event) {
    if (state == STATE_IMAGE) {
        var c = document.getElementById('canvasImage');

        var x = event.pageX - c.offsetLeft;
        var y = event.pageY - c.offsetTop;

        var rect = c.getBoundingClientRect();
        x = x/rect.width * c.width;
        y = y/rect.height * c.height;

        const box_size = 5;  // pixels
        var cols = ['green', 'yellow', 'red'];

        var ctx = c.getContext('2d');
        ctx.fillStyle = cols[image_points_index];
        ctx.fillRect(x-box_size, y-box_size, box_size*2, box_size*2);

        image_points[image_points_index][0] = x;
        image_points[image_points_index][1] = y;
        image_points_index++; 
        if (image_points_index == 3) {
            image_points_index = 0;
            if (image_points[0][0] > image_points[2][0]) {
                if (document.getElementById("eye").value == EYE_BUTTON_LEFT) toggle_eye(); // set eye to left (text to right)
            } else {
                if (document.getElementById("eye").value == EYE_BUTTON_RIGHT) toggle_eye();
            }
            onh_hyp = spectralis_ring_diameter/2/distance(1,2) * distance(0,2);
            onh_theta = Math.atan2(image_points[2][1] - image_points[0][1], image_points[0][0] - image_points[2][0]);

            var onhx = check_bounds(Math.round(toVF(-onh_hyp * Math.cos(onh_theta)),1), 'onhx');
            var onhy = check_bounds(Math.round(toVF(-onh_hyp * Math.sin(onh_theta)),1), 'onhy');

            document.getElementById('onhx').value = onhx;
            document.getElementById('onhy').value = onhy;

            show_map();
        }
    } else if (state == STATE_MAP) {   // clicking in the map
    }
}//handle_clicks_on_image()

window.onresize = function() { show_map(); } 

window.onload = function() {
    var file = document.getElementById('input_file');
    file.addEventListener('change', handleFiles);

        // what to do when the image is clicked?
        // Store clicked points in image_points[] array and when 
        // it is full (3 points) draw a map
    var c = document.getElementById('canvasImage');
    c.addEventListener('click', handle_clicks_on_image, false);
    c.addEventListener('mousemove',handle_mousemove);
    c.addEventListener('click', handle_clicks_on_image, false);

}

    // Flip left/right eye and redraw.
    // Note button text is the opposite of the eye shown.
function toggle_eye() {
    var t = document.getElementById("eye");
    t.value = t.value == EYE_BUTTON_LEFT ? EYE_BUTTON_RIGHT : EYE_BUTTON_LEFT;

    var that = document.getElementById("onhx");

    if (t.value == EYE_BUTTON_RIGHT) {
        if (that.value > 0)
            that.value = -1 * that.value;
    } else {
        if (that.value < 0)
            that.value = -1 * that.value;
    }

    if (t.value == EYE_BUTTON_LEFT) {   // so showing right eye
        var r = document.getElementById("onhx");
        r.min = 12;
        r.max = 18;
    } else {
        var r = document.getElementById("onhx");
        r.min = -18;
        r.max = -12;
    }

    show_map();
}

function handle_mousemove(e) {
    if (state == STATE_MAP) {
        var x = e.clientX;
        var y = e.clientY;
        var can = document.getElementById('canvasImage');
        var context = can.getContext('2d');
        var rect = can.getBoundingClientRect();
        x = x/rect.width * can.width;
        y = y/rect.height * can.height;

        var imgd = context.getImageData(x, y, 1, 1);
        var pix = imgd.data;

        set_exploding_sector(pix);
        show_map();
//document.getElementById('junk').value = x + "," + y + "pix= " + pix;
    }
}

    // give SSD between a hex color code and an rgb array
function color_distance(hex, rgb) {
    var t = hexToRgb(hex);
    return Math.pow((rgb[0]-t.r),2)+Math.pow((rgb[1]-t.g),2)+Math.pow((rgb[2]-t.b),2);
}

    // set exploding_sector based on color under mouse
function set_exploding_sector(pix) {
    var diff=[];
    for(var i = 0; i < scols.length; i++)
        diff.push(color_distance(scols[i], pix));
    var ii = indexOfSmallest(diff);
    if (diff[ii] < 10)
        exploding_sector = ii;
    else
        exploding_sector = -1;

//document.getElementById('junk').value = pix + " " + ii + " " + diff[ii];
//document.getElementById('junk').value = exploding_sector;
//document.getElementById('junk').value = hexToRgb(scols[0]).r + "," + hexToRgb(scols[0]).g + "," + hexToRgb(scols[0]).b + "|" + pix;
}

    // return the index of the smallest value in an array
function indexOfSmallest(a) {
    var lowest = 0;
    for (var i = 1; i < a.length; i++)
        if (a[i] < a[lowest]) 
            lowest = i;
    return lowest;
}

    // convert hex color to rgb triple
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
