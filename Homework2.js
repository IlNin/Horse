"use strict";
// Global variables
var canvas;
var gl;
var numVertices = 24;
var program;
var vBuffer;
var tBuffer;
var pointsArray = [];
var texPointsArray = [];
var stack = [];
var stack2 = [];

// Matrices variables
var modelViewMatrix;
var modelViewMatrixLoc;
var projectionMatrix;
var instanceMatrix;

// ModelView Matrix variables
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
const eye = vec3(0.0, 0.0, -25.0); // default: 0, 0, -25

// Projection Matrix variables
var near = 0.1;
var far = 100.0;
var fovy = 45.0; 
var aspect = 1;

// List of vertices
var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0) ];
    
// List of texture points
var texture1;
var texture2;
var textureLoc;
var texCoord = [
    vec2(1, 1),
    vec2(1, 0),
    vec2(0, 0),
    vec2(0, 1) ];
    
// Create checkerboard and vanishing texture
var texSize = 256;
var numChecks = 8;
var c;

var image1 = new Uint8Array(4*texSize*texSize); // Checkerboard pattern
    for ( var i = 0; i < texSize; i++ ) {
        for ( var j = 0; j <texSize; j++ ) {
            var patchx = Math.floor(i/(texSize/numChecks));
            var patchy = Math.floor(j/(texSize/numChecks));
            if  (patchx%2 ^ patchy%2) {
                c = 255; }
            else {
                c = 0; }
                //c = 255*(((i & 0x8) == 0) ^ ((j & 0x8)  == 0)) 
            image1[4*i*texSize+4*j] = c;
            image1[4*i*texSize+4*j+1] = c;
            image1[4*i*texSize+4*j+2] = c;
            image1[4*i*texSize+4*j+3] = 255; } }

var image2 = new Uint8Array(4*texSize*texSize); // Vanishing effect
    var factor = 0.5;
    var base = 15;
    for ( var i = 0; i < texSize; i++ ) {
        for ( var j = 0; j <texSize; j++ ) {
            image2[4*i*texSize+4*j] = base+factor*j;
            image2[4*i*texSize+4*j+1] = base+factor*j;
            image2[4*i*texSize+4*j+2] = base+factor*j;
            image2[4*i*texSize+4*j+3] = 255; } }

// IDs of body parts
var numNodes = 15;

var torsoId = 0;
var headId  = 1;
var leftPosteriorUpperLegId = 2;
var leftPosteriorLowerLegId = 3;
var rightPosteriorUpperLegId = 4;
var rightPosteriorLowerLegId = 5;
var leftAnteriorUpperLegId = 6;
var leftAnteriorLowerLegId = 7;
var rightAnteriorUpperLegId = 8;
var rightAnteriorLowerLegId = 9;
var tailId = 10;
var torsoId2 = 11;
var neckId = 12;
var leftEarId = 13;
var rightEarId = 14;

// Parameters of body parts
var torsoHeight = 2.0;
var torsoWidth = 2.0;
var torsoLength = 7.0;
var neckHeight = 1.4;
var neckWidth = 1.0;
var neckLength = 4.0;
var headHeight = 1.4;
var headWidth = 1.0;
var headLength = 2.5;
var upperLegHeight = 1.5;
var upperLegWidth = 0.8;
var lowerLegHeight = 2.4;
var lowerLegWidth  = 0.5;
var tailHeight = 0.5;
var tailWidth = 0.5;
var tailLength = 3.0;
var earHeight = 0.5;
var earWidth = 0.2;

// Angle variables
var numAngles = 15;
var theta = [30, -30, -25, -20, -25, -20, 5, 0, 5, 0, 15, 0, 15, 15, -15];

// Initialize an empty figure
var figure = [];
for (var i=0; i<numNodes; i++) {
    figure[i] = createNode(null, null, null, null); }
    
// IDs of obstacle parts
var numPieces = 4;

var upperBlockId = 0;
var leftBlockId = 1;
var rightBlockId = 2;
var lowerBlockId = 3;

var blockHeight = 0.5;
var blockWidth = 5.0;
var blockLength = 0.5;
var verticalBlockWidth = 3.5;

// Initialize an empty obstacle
var obstacle = [];
for (var i=0; i<numPieces; i++) {
    obstacle[i] = createNode(null, null, null, null); }
    
// Animation variables
var animation = false;

var torsoAnimation = 1.0;
var torsoJump = 0.0;
var neckAnimation = 0.5;
var posteriorLegAnimation = 3.0;
var anteriorLegAnimation = -3.0;
var posteriorLowerLegAnimation = 1.0;
var anteriorLowerLegAnimation = -1.0;
var tailAnimation = 0.5;
var obstaclePosition = -100.0;
var obstacleAnimation = 0.5;

//--------------------------------------------------------------------------------------------------------

// Create a texture    
function configureTexture() {
    texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); }

// Assign the proportions to a cube
function scale4(width, height, length) {
    var result = mat4();
    result[0][0] = width;
    result[1][1] = height;
    result[2][2] = length;
    return result; }

// Create a node
function createNode(transform, render, sibling, child){
    var node = {
        transform: transform,
        render: render,
        sibling: sibling,
        child: child }
    return node; }

// Initialize the node that matches the provided ID
function initNodesHorse(Id) {
    var m = mat4();
    switch(Id) {
        // TORSO
        case torsoId:
        case torsoId2:
            m = rotate(theta[torsoId], 0, 1, 0); // Rotation controlled by the slider
            stack2.push(m); // Used by the obstacle so that it doesn't animate like the horse
            m = mult(m, rotate(theta[torsoId2], 1, 0, 0)); // Throttle animation
            m = mult(m, translate(0.0, torsoJump, 0.0));
            figure[torsoId] = createNode(m, torso, null, neckId);
            break;
        
        // NECK
        case neckId:
            m = translate(0.0, torsoHeight*0.7, -(0.5*torsoLength));
            m = mult(m, rotate(theta[neckId], 1, 0, 0))
            m = mult(m, translate(0.0, -0.5*headHeight, 0.0));
            figure[neckId] = createNode(m, neck, leftPosteriorUpperLegId, headId);
            break;
            
        // HEAD
        case headId:
            m = translate(0.0, 0.1*neckHeight, -(0.7*neckLength));
            m = mult(m, rotate(theta[headId], 1, 0, 0))
            m = mult(m, translate(0.0, -0.5*headHeight, 0.0));
            figure[headId] = createNode(m, head, null, leftEarId);
            break;

        // LEFT POSTERIOR UPPER LEG
        case leftPosteriorUpperLegId:
            m = translate(-(torsoWidth-upperLegWidth), 0.3*upperLegHeight, 0.35*torsoLength);
            m = mult(m, rotate(theta[leftPosteriorUpperLegId], 1, 0, 0));
            m = mult(m, scale4(1.0, -1.0, 1.0));
            figure[leftPosteriorUpperLegId] = createNode(m, upperLeg, rightPosteriorUpperLegId, leftPosteriorLowerLegId);
            break;
        
        // LEFT POSTERIOR LOWER LEG
        case leftPosteriorLowerLegId:
            m = translate(0.0, 1.3, 0.5);
            m = mult(m, rotate(theta[leftPosteriorLowerLegId], 1, 0, 0));
            figure[leftPosteriorLowerLegId] = createNode(m, lowerLeg, null, null);
            break;
            
        // RIGHT POSTERIOR UPPER LEG
        case rightPosteriorUpperLegId:
            m = translate(torsoWidth-upperLegWidth, 0.3*upperLegHeight, 0.35*torsoLength);
            m = mult(m, rotate(theta[rightPosteriorUpperLegId], 1, 0, 0));
            m = mult(m, scale4(1.0, -1.0, 1.0));
            figure[rightPosteriorUpperLegId] = createNode(m, upperLeg, leftAnteriorUpperLegId, rightPosteriorLowerLegId);
            break;
        
        // RIGHT POSTERIOR LOWER LEG
        case rightPosteriorLowerLegId:
            m = translate(0.0, 1.3, 0.5);
            m = mult(m, rotate(theta[rightPosteriorLowerLegId], 1, 0, 0));
            figure[rightPosteriorLowerLegId] = createNode(m, lowerLeg, null, null);
            break;
       
        // LEFT ANTERIOR UPPER LEG
        case leftAnteriorUpperLegId:
            m = translate(-(torsoWidth-upperLegWidth), 0.3*upperLegHeight, -(0.45*torsoLength));
            m = mult(m, rotate(theta[leftAnteriorUpperLegId], 1, 0, 0));
            m = mult(m, scale4(1.0, -1.0, 1.0));
            figure[leftAnteriorUpperLegId] = createNode(m, upperLeg, rightAnteriorUpperLegId, leftAnteriorLowerLegId);
            break; 
            
       // LEFT ANTERIOR LOWER LEG
        case leftAnteriorLowerLegId:
            m = translate(0.0, 1.1, -0.01);
            m = mult(m, rotate(theta[leftAnteriorLowerLegId], 1, 0, 0));
            figure[leftAnteriorLowerLegId] = createNode(m, lowerLeg, null, null);
            break;
            
        // RIGHT ANTERIOR UPPER LEG
        case rightAnteriorUpperLegId:
            m = translate(torsoWidth-upperLegWidth, 0.3*upperLegHeight, -(0.45*torsoLength));
            m = mult(m, rotate(theta[rightAnteriorUpperLegId], 1, 0, 0));
            m = mult(m, scale4(1.0, -1.0, 1.0));
            figure[rightAnteriorUpperLegId] = createNode(m, upperLeg, tailId, rightAnteriorLowerLegId);
            break; 
            
       // RIGHT ANTERIOR LOWER LEG
        case rightAnteriorLowerLegId:
            m = translate(0.0, 1.1, -0.01);
            m = mult(m, rotate(theta[rightAnteriorLowerLegId], 1, 0, 0));
            figure[rightAnteriorLowerLegId] = createNode(m, lowerLeg, null, null);
            break;
        
        // TAIL
        case tailId:
            m = translate(0.0, torsoHeight*0.6, 0.65*torsoLength);
            m = mult(m, rotate(theta[tailId], 1, 0, 0));
            figure[tailId] = createNode(m, tail, null, null);
            break;
        
        // LEFT EAR
        case leftEarId:
            m = translate(-0.4, 1.4, 0.5*headLength);
            m = mult(m, rotate(theta[leftEarId], 0, 0, 1));
            figure[leftEarId] = createNode(m, ear, rightEarId, null);
            break;
         
        // RIGHT EAR
        case rightEarId:
            m = translate(0.4, 1.4, 0.5*headLength);
            m = mult(m, rotate(theta[rightEarId], 0, 0, 1));
            figure[rightEarId] = createNode(m, ear, null, null);
            break; } }
        
function initNodesObstacle(Id) {
    var m = mat4();
    switch(Id) {
        // UPPER BLOCK
        case upperBlockId:
            m = stack2.pop();
            m = mult(m, translate(0.0, 0.0, obstaclePosition));
            obstacle[upperBlockId] = createNode(m, block, null, leftBlockId); 
            break;
        
        // LEFT BLOCK
        case leftBlockId:
            m = translate(-2.0, -1.1, 0.0);
            m = mult(m, rotate(90, 0, 0, 1));
            obstacle[leftBlockId] = createNode(m, verticalBlock, rightBlockId, null); 
            break;
            
        // RIGHT BLOCK
        case rightBlockId:
            m = translate(2.5, -1.1, 0.0);
            m = mult(m, rotate(90, 0, 0, 1));
            obstacle[rightBlockId] = createNode(m, verticalBlock, lowerBlockId, null); 
            break; 
            
        // LOWER BLOCK
        case lowerBlockId:
            m = translate(0.0, -1.0, 0.0);
            obstacle[lowerBlockId] = createNode(m, block, null, null); 
            break; } }
        
// Traverse in order the nodes of the horse
function traverseHorse(Id) {
    if (Id == null) {
        return; }
    stack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
    figure[Id].render();
    if (figure[Id].child != null) {
        traverseHorse(figure[Id].child); }
    modelViewMatrix = stack.pop();
    if (figure[Id].sibling != null) {
        traverseHorse(figure[Id].sibling); } }
        
// Traverse in order the nodes of the obstacle
function traverseObstacle(Id) {
    if (Id == null) {
        return; }
    stack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, obstacle[Id].transform);
    obstacle[Id].render();
    if (obstacle[Id].child != null) {
        traverseObstacle(obstacle[Id].child); }
    modelViewMatrix = stack.pop();
    if (obstacle[Id].sibling != null) {
        traverseObstacle(obstacle[Id].sibling); } }

// Draw torso
function torso() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5*torsoHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(torsoWidth, torsoHeight, torsoLength));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i =0; i<6; i++) {
        if (i == 0) { // White face
            gl.uniform1f(textureLoc, 2.0); }
        else if (i == 4) { // Checkerboard texture
            gl.uniform1f(textureLoc, 3.0); }
        else { // Checkerboard texture with decreasing intensity
            gl.uniform1f(textureLoc, 1.0); }
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); }
    gl.uniform1f(textureLoc, 0.0); }

// Draw neck
function neck() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5*neckHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(neckWidth, neckHeight, neckLength));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }
        
// Draw head
function head() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(headWidth, headHeight, headLength));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }

// Draw upper leg
function upperLeg() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }
        
// Draw lower leg
function lowerLeg() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }

// Draw tail
function tail() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * tailHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(tailWidth, tailHeight, tailLength) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }
        
// Draw ear
function ear() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * earHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(earWidth, earHeight, earWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); } }

// Draw horizontal block
function block() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * blockHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(blockWidth, blockHeight, blockLength) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    gl.uniform1f(textureLoc, 3.0);
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); }
    gl.uniform1f(textureLoc, 0.0); }

// Draw vertical block
function verticalBlock() {
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * blockHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(verticalBlockWidth, blockHeight, blockLength) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    gl.uniform1f(textureLoc, 3.0);
    for(var i =0; i<6; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4); }
    gl.uniform1f(textureLoc, 0.0); }

// Fill the arrays with all the necessary points in order to create a cube
function quad(a, b, c, d) {
    pointsArray.push(vertices[a]);
    pointsArray.push(vertices[b]);
    pointsArray.push(vertices[c]);
    pointsArray.push(vertices[d]);
    
    if (a == 5) { // The texture on this face has to be reversed
        texPointsArray.push(texCoord[0]);
        texPointsArray.push(texCoord[1]);
        texPointsArray.push(texCoord[2]);
        texPointsArray.push(texCoord[3]); }
    else { // Normal order
        texPointsArray.push(texCoord[3]);
        texPointsArray.push(texCoord[2]);
        texPointsArray.push(texCoord[1]);
        texPointsArray.push(texCoord[0]); } }

// Create a cube
function cube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1); }
    
//--------------------------------------------------------------------------------------------------------

// Main
window.onload = function init() {
    // INITIALIZE CANVAS
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // LOAD SHADERS
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // INITIALIZE MATRICES
    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);
    instanceMatrix = mat4();

    // SET MATRICES
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    
    // LINK MODELVIEWMATRIX
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    // INITIALIZE THE CUBE
    cube();

    // INITIALIZE BUFFER
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texPointsArray), gl.STATIC_DRAW);

    var vTexPoints = gl.getAttribLocation(program, "vTexPoints");
    gl.vertexAttribPointer(vTexPoints, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexPoints);
    
    // INITIALIZE CHECKERBOARD TEXTURE
    configureTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(gl.getUniformLocation(program, "Tex0"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.uniform1i(gl.getUniformLocation(program, "Tex1"), 1);
    
    textureLoc = gl.getUniformLocation(program, "texturing");
    gl.uniform1f(textureLoc, 0.0);
    
    // GET INPUTS FROM SLIDERS
    document.getElementById("slider0").onchange = function(event) {
        theta[torsoId] = event.target.value;
        initNodesHorse(torsoId);
        initNodesObstacle(upperBlockId); };
    
    document.getElementById("play").onclick = function(event) {
        if (animation == false) {
            this.innerHTML = "Stop Animation"; }
        else {
            this.innerHTML = "Play Animation"; }
        animation = !animation; };
        
    // INITIALIZE ALL NODES
    for(i=0; i<numNodes; i++) {
        initNodesHorse(i); }
    
    for (i=0; i<numPieces; i++) {
        initNodesObstacle(i); }

    // RENDER
    render(); }

// RENDER THE SCENE
var render = function() {
    // CLEAR BUFFER
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // ANIMATION
    if (animation == true) {
    
        if (obstaclePosition >= -20.0 && obstaclePosition < 0) { // Time to star the jump
            torsoJump = torsoJump+0.1;
            theta[leftPosteriorLowerLegId] += 2.0;
            theta[rightPosteriorLowerLegId] += 2.0; 
            theta[leftAnteriorLowerLegId] += 2.0;
            theta[rightAnteriorLowerLegId] += 2.0; }
        else if (obstaclePosition >= 0.0 && obstaclePosition < 20.0) { // Time to finish the jump
            torsoJump = torsoJump-0.1;
            theta[leftPosteriorLowerLegId] -= 2.0;
            theta[rightPosteriorLowerLegId] -= 2.0;
            theta[leftAnteriorLowerLegId] -= 2.0;
            theta[rightAnteriorLowerLegId] -= 2.0; }
        else { 
            // Running animation
            theta[torsoId2] += torsoAnimation;
            theta[neckId] += neckAnimation;
            theta[leftPosteriorUpperLegId] += posteriorLegAnimation;
            theta[rightPosteriorUpperLegId] += posteriorLegAnimation;
            theta[leftAnteriorUpperLegId] += anteriorLegAnimation;
            theta[rightAnteriorUpperLegId] += anteriorLegAnimation;
            theta[leftPosteriorLowerLegId] += posteriorLowerLegAnimation;
            theta[rightPosteriorLowerLegId] += posteriorLowerLegAnimation;
            theta[leftAnteriorLowerLegId] += anteriorLowerLegAnimation;
            theta[rightAnteriorLowerLegId] += anteriorLowerLegAnimation;
            theta[tailId] += tailAnimation;
        
            // Check the endpoints of the animations
            if (theta[torsoId2] == 5.0) {
                torsoAnimation = -0.5; }
            if (theta[torsoId2] == -5.0) {
                torsoAnimation = 0.5; }
            if (theta[neckId] == 25.0) {
                neckAnimation = -0.5; }
            if (theta[neckId] == 5.0) {
                neckAnimation = 0.5; }
            if (theta[leftPosteriorUpperLegId] >= 6.0) {
                posteriorLegAnimation = -3.0;
                posteriorLowerLegAnimation = -1.0; }
            if (theta[leftPosteriorUpperLegId] <= -46.0) {
                posteriorLegAnimation = 3.0;
                posteriorLowerLegAnimation = 1.0; }
            if (theta[leftAnteriorUpperLegId] >= 26.0) {
                anteriorLegAnimation = -3.0;
                anteriorLowerLegAnimation = -1.0; }
            if (theta[leftAnteriorUpperLegId] <= -26.0) {
                anteriorLegAnimation = 3.0;
                anteriorLowerLegAnimation = 1.0; }
            if (theta[tailId] == 20.0) {
                tailAnimation = -0.5; }
            if (theta[tailId] == 10.0) {
                tailAnimation = 0.5; } }
        
        // Move the obstacle
        obstaclePosition += obstacleAnimation;
        if (obstaclePosition == 100.0) {
                obstaclePosition = -100; }
         
        // Refresh the nodes
        initNodesHorse(torsoId2);
        initNodesHorse(neckId);
        initNodesHorse(leftPosteriorUpperLegId);
        initNodesHorse(rightPosteriorUpperLegId); 
        initNodesHorse(leftAnteriorUpperLegId);
        initNodesHorse(rightAnteriorUpperLegId);
        initNodesHorse(leftPosteriorLowerLegId);
        initNodesHorse(rightPosteriorLowerLegId);
        initNodesHorse(leftAnteriorLowerLegId);
        initNodesHorse(rightAnteriorLowerLegId);
        initNodesHorse(tailId);
        initNodesObstacle(upperBlockId); }
        
    traverseHorse(torsoId);
    traverseObstacle(upperBlockId);
    requestAnimFrame(render); }