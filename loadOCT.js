/*
Load an image, allow 3 clicks on it (Fovea, ring, onh centre) and report ONH X and Y.

Author: Andrew Turpin (aturpin@unimelb.edu.au)
Date: Sun 28 Apr 2019 10:43:06 PDT
*/



var g_image_points = [];

const STATE_GET_FILE = -1;  
const STATE_GET_FOV  = 0;  // Used to index g_image_points so don't change.
const STATE_GET_RING = 1;  // Also assumed to be in sequence.
const STATE_GET_ONH  = 2;  // Also this assumed to be the greatest number.

var g_state = STATE_GET_FILE;

    // ASSUMES scaleable_canvas.js has been loaded.
var g_cwidth = get_xmax();            // virtual pixels   (all scaling done relative to this)
var g_cheight = get_ymax();
const g_radius = 5;      // virtual pixels

var g_image = new Image();

function draw_canvas() {
    resize_canvas('canvasImage', window.innerWidth, window.innerHeight);

    var can = document.getElementById('canvasImage')
    var ctx = can.getContext('2d');
    ctx.clearRect(0, 0, can.width, can.height);
    ctx.rect(0, 0, can.width, can.height);
    ctx.stroke();

    if (g_state == STATE_GET_FILE) {
        ctx.textAlign = "center"; 
        ctx.fillText("Use Choose File button to load a Spectralis OCT file", scale(g_cwidth/2), yscale(g_cheight/2));
    } else {
        ctx.drawImage(g_image,0,0, scale(g_cwidth), yscale(g_cheight));

        for (i = 0 ; i < g_image_points.length ; i++) {
            ctx.beginPath();
            const x = scale(g_image_points[i][0]);
            const y = yscale(g_image_points[i][1]);
            ctx.strokeStyle = "red";
            ctx.arc(x, y, 2*scale(g_radius), 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.stroke();
        }
    }

    if (g_image_points.length == 3) {
        const l_onhx  = document.getElementById('onhx')
        const l_onhy  = document.getElementById('onhy')

        const mm_per_pix = 3.5/2 / distance(1,2); // Spectralis 3.5mm ring
        const onhx = toVF((g_image_points[2][0] - g_image_points[0][0]) * mm_per_pix);
        const onhy = toVF((g_image_points[0][1] - g_image_points[2][1]) * mm_per_pix);
        l_onhx.innerText = onhx.toFixed(0) + "\xB0 (" + onhx.toFixed(2) + ")";
        l_onhy.innerText = onhy.toFixed(0) + "\xB0 (" + onhy.toFixed(2) + ")";

        //const l_raphe = document.getElementById('raphe')
        //l_raphe.innerText = g_image_points.length;

        //const l_mmpp = document.getElementById('mm_per_pixel');
        //l_mmpp.innerText = mm_per_pix;
    }
}

function handle_file(e) {
    g_image.onload=function() { draw_canvas(); }
    g_image.src=URL.createObjectURL(e.target.files[0])
    g_state = STATE_GET_FOV;
}

// return [x,y] for event e
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

    return [x, y];
}

function handle_clicks(e) {
    if (g_state > STATE_GET_FILE) {
        const [x, y] = get_xy_from_event(e);

        if (g_state == STATE_GET_FOV) {
            g_image_points = [[unscale(x),yunscale(y)]];
        } else {
            g_image_points.push([unscale(x),yunscale(y)]);
        }
        g_state++;
        if (g_state > STATE_GET_ONH) {
            g_state = STATE_GET_FOV;
        }
    }

    draw_canvas();
}

window.onload = function() {
    var c = document.getElementById('canvasImage');
    c.addEventListener('click', handle_clicks, false);
    c.addEventListener('touchstart', handle_clicks, false);

    var file = document.getElementById('input_file');
    file.addEventListener('change', handle_file);
}

    // Return Euclidean distance between g_image_points[i1] and g_image_points[i2]
    // i1 i2 are indexes into g_image_points
function distance(i1, i2) {
    dx = g_image_points[i1][0] - g_image_points[i2][0];
    dy = g_image_points[i1][1] - g_image_points[i2][1];
    return (Math.sqrt(Math.pow(dx,2) + Math.pow(dy, 2)))
}

    // convert mm on retina to degrees of VF (from nodal point)
function toVF(mm_on_ret) {
    var p = 17/22.6;
    var nd = 11.459 * 2.0 * p;
    return (Math.atan2(mm_on_ret, nd) * 180.0 / Math.PI);
}

