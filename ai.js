


var size = []; // [width, height]

// checks for the smiley face that appears when game is over
function isGameOver() {
    let el_face = document.getElementById("face");
    if (el_face.classList.contains("facesmile"))
        return false;
    return true;
}

// gets the cell based on id
function getCellFromId(id) {
    let position = id.replace("#","").split('_');
    position = [parseInt(position[1])-1, parseInt(position[0])-1];
    return getCell(position[0], position[1]);
}

// getCell(x,y) gets the value, element, id, and position of a cell at x y returns nothing if x and y arent valid coords
function getCell(x, y) {
    let index = x + size[0] * y
    if (x < 0 || y < 0 || y > size[1] || x > size[0] || index < 0 || index >= cells.length || !cells[index])
        return;

    let class_val = cells[index].classList[1];

    if (class_val.includes("blank")) class_val = -2;
    else if (class_val.includes("bombflagged")) class_val = -1;
    else class_val = parseInt(class_val.replace("open",""));

    return {
        value: class_val, // -2 : unclicked, -1 : flagged, 0 : no number, 1 - 8 : number
        element: $("#"+(y+1)+"_"+(x+1)),
        id: "#"+(y+1)+"_"+(x+1),
        position: [x, y]
     };
}

// clickCell(x,y,button)
// when given all 3 parameters clicks the cell with pos x,y using the button passed
// button ( 0 = left click, 2 = right click(Flag mine))
// returns true if cell was clicked succesfully
// returns false if cell you tried to right click(2) was already flagged
// if only 2 variables passsed function assumes first variable is the cell id and parses x and y from that
function clickCell(x, y, button) {
    console.log("clicking",y+1,"_",x+1,button)
    let element;
    if (button == undefined) {
        let cell = getCellFromId(x);
        // dont flag a cell thats been flagged
        if (cell.value == -1 && button == 2){
            return false;
        }
        element = getCellFromId(x).element.get(0);
        button = y;
    } else {
        let cell = getCell(x,y); 
        // dont flag a cell thats been flagged
        if (cell.value == -1 && button == 2){
            return false;
        }
        element = getCell(x,y).element.get(0);
    }

    if (element) {
        element.dispatchEvent(new MouseEvent("mousedown", {'view':window, 'bubbles':true, 'cancelable':true, 'button':button}));
        element.dispatchEvent(new MouseEvent("mouseup", {'view':window, 'bubbles':true, 'cancelable':true, 'button':button}));
    }
    scanBoard();
    return true;
}

var cells = [];
var border_cells = [];
var mines_left = 0;
var open_cells = {};    // { cell_id : [border_cells indexes] }

// scamBoard scans the board listing all border cells and all the open cells along with what cells border which
function scanBoard() {
    cells = $("#game .square"); 
    border_cells = [];
    open_cells = {};

    // find border cells
    let _open_cells = $(".square.open1, .square.open2, .square.open3, .square.open4");
    //console.log('_open_cells',_open_cells)
    let illegall = []
    _open_cells.each(function(i, e){
        // check all neighboring cells
        let open_cell = getCellFromId(e.id);
        let position = e.id.replace("#","").split('_');
        position = [parseInt(position[1])-1, parseInt(position[0])-1];
        if (position[0] > size[0] || position[1] > size[1]){
            console.log('illegal');
            illegall.push(e);
        } else if (open_cell) {
            for (let offx = -1; offx <= 1; offx++) {
                for (let offy = -1; offy <= 1; offy++) {
                    let cell = getCell(open_cell.position[0]+offx, open_cell.position[1]+offy);

                    // add untouched cell to collection
                    if (cell && cell.value <= -1) {
                        if (!(open_cell.id in open_cells))
                            open_cells[open_cell.id] = [];

                        let el_index = border_cells.findIndex((element) => element == cell.id);
                        if (el_index < 0) {
                            let position2 = cell.id.replace("#","").split('_');
                            position2 = [parseInt(position2[1])-1, parseInt(position2[0])-1];
                            //console.log(position2)
                            if (position2[0] <= size[0] || position2[1] <= size[1]){
                                border_cells.push(cell.id);
                                el_index = border_cells.length - 1;
                            }
                        }
                        if (!open_cells[open_cell.id].includes(el_index))
                            open_cells[open_cell.id].push(el_index);

                        let b_cell = getCellFromId(border_cells[el_index])
                        //b_cell.element.html(el_index);
                        b_cell.element.addClass("suspect")
                    }
                }
            }
        }
    });
    //cleaning up border cells and open cells
}


function prepareAI() {
    iterations = 0;
    size = [$("#game .bordertb").length/3, $("#game .borderlr").length/2];
    scanBoard();
}

// returns true if it can't make a good choice
let min_count = [];
function showProbabilities() {
    scanBoard();

    let probabilities = {};
    let safe_border_cells = [];
    let no_zero = false;
    let max = 0;

    // iterate cells with a number in it
    for (let cell_id in open_cells) {
        let open_cell = getCellFromId(cell_id);
        let open_cell_value = open_cell.value;

        // decrement value if there are flags nearby
        for (let b = 0; b < open_cells[cell_id].length; b++) {
            let border_cell = getCellFromId(border_cells[open_cells[cell_id][b]]);

            if (border_cell.value == -1)
                open_cell_value--;

            if (open_cell_value <= 0)
                safe_border_cells.push(border_cell.id);
        }

        // iterate cells that are adjacent to the open cell
        for (let b = 0; b < open_cells[cell_id].length; b++) {
            let border_cell = getCellFromId(border_cells[open_cells[cell_id][b]]);

            // is this an unclicked cell
            if (border_cell.value == -2) {
                if (!probabilities[border_cell.id]) probabilities[border_cell.id] = 0;

                // this cell is marked safe, skip it
                if (safe_border_cells.includes(border_cell.id)) {
                    probabilities[border_cell.id] = 0;
                    continue;
                }

                probabilities[border_cell.id] += open_cell_value;

                if (probabilities[border_cell.id] > 0) no_zero = true;
                if (probabilities[border_cell.id] > max) max = probabilities[border_cell.id];
            }
        }
    }

    // print probabilities
    console.log("-- probabilties (chance of having a mine) --");
    let min = 101, min_id = '';
    min_count = [];
    for (let id in probabilities) {
        probabilities[id] = Math.floor(probabilities[id] / max * 100);
        if (probabilities[id] < min) {
            min = probabilities[id];
            min_id = id;
            min_count = [id];
        }
        // is this probability the same as the previous min?
        if (probabilities[id] == min && !min_count.includes(id)) {
            min_count.push(id);
        }
        console.log(`${id}: ${probabilities[id]}%`);
    }
    console.log(`-- min probabilty cell ids (${min}%) --`);
    console.log(min_count.join(', '))

    // click a low probability cell
    if (min_id != '' && min_count.length == 1);
        clickCell(min_id, 0);

    // too many similar probabilties. make the user choose one :)
    if (min_count.length > 1) {
        // multiple 0% cells
        if (min == 0) {
            for (let id of min_count) {
                clickCell(id, 0);
            }

        } else {
            console.log("[!!] This is a tough choice. Click a gray cell. [!!]");
            for (let id of min_count) {
                let el_cell = getCellFromId(id).element.get(0);
                el_cell.classList.add("highlight");
                no_zero = false;
            }
        }
    }

    return no_zero;
}


// reveal cells that are guaranteed to be safe (Ex. a cell with a '1' that has 1 nearby flag is correct. reveal all the other cells around it)
function safeMoves() {
    for (let cell_id in open_cells) {
        let open_cell = getCellFromId(cell_id);
        let open_cell_value = open_cell.value;
        let safe = false;
         // look at surrounding cells
        for (let b = 0; b < open_cells[cell_id].length; b++) {
            let border_cell = getCellFromId(border_cells[open_cells[cell_id][b]]);
             if (border_cell.value == -1) {
                open_cell_value--;
            }
             // this group of cells is safe
            if (open_cell_value <= 0) {
                safe = true;
                break;
            }
        }
         // reveal all other cells
        if (safe) {
            for (let b = 0; b < open_cells[cell_id].length; b++) {
                console.log(`${border_cells[open_cells[cell_id][b]]} is safe. Revealing...`);
                clickCell(border_cells[open_cells[cell_id][b]], 0);
            }
            return true;
        }
        return false;
    }
}
// this function takes the matrix ( either reduced or not ) and decides
// if it can which locations are mines
function processMatrix(reduced_mine_matrix){
    let columns = reduced_mine_matrix[0].length;
    let changed = false
    for (let y = 0; y < reduced_mine_matrix.length; y++) {
        //console.log(reduced_mine_matrix[y])
        let psum = 0
        let nsum = 0
        let qsum = 0
        let pos = false
        let neg = false
        let flagAll = false
        let flagPos = false
        let flagNeg = false
        // calculate positive and negative sums
        for (let x = 0; x <= columns - 2; x++) {
            let num = reduced_mine_matrix[y][x]
            if (num > 0){
                pos = true
                psum = psum + num
            }else if(num < 0) {
                neg = true
                nsum = nsum + num
            }
            
        }
        // figure out which to flag, positive or negative
        if (pos && neg){
            if ((psum+nsum) == reduced_mine_matrix[y][columns-1]){flagAll = true}
        }else if(pos){
            if ((psum) == reduced_mine_matrix[y][columns-1]){flagPos = true}
        }else if(neg){
            if ((nsum) == reduced_mine_matrix[y][columns-1]){flagNeg = true}
        }
        var clickedArr = Array(columns-1).fill(false)
        // go through the row and click all the flags that have been determined to be mines
        for (let x = 0; x <= columns - 2; x++) {
            cellValue = reduced_mine_matrix[y][x]
            if (flagAll) {
                if (reduced_mine_matrix[y][x] != 0){
                    let cell = getCellFromId(border_cells[x]);
                    if (!clickedArr[x]){
                        clickedArr[x] = true 
                        changed = clickCell(cell.position[0], cell.position[1], 2)
                    }
                }
            } else if (flagPos){
                let cell = getCellFromId(border_cells[x]);
                if (cellValue > 0){
                    if (!clickedArr[x]){
                        clickedArr[x] = true
                        
                        changed = clickCell(cell.position[0], cell.position[1], 2);
                    }
                } else if (cellValue < 0){
                    if (!clickedArr[x]){
                        clickedArr[x] = true
                        changed = clickCell(cell.position[0], cell.position[1], 0);
                    }
                }
            } else if (flagNeg){
                let cell = getCellFromId(border_cells[x]);
                if (cellValue > 0){
                    if (!clickedArr[x]){
                        clickedArr[x] = true
                        
                        changed = clickCell(cell.position[0], cell.position[1], 0);
                    }
                } else if (cellValue < 0){
                    if (!clickedArr[x]){
                        clickedArr[x] = true
                        
                    }
                }
            }
        }
    }
    console.log(changed)
    return changed
}
// returns whether game is over
let last_mine_matrix = "";
function calculateMove() {
    console.log("calling calculate move");
    scanBoard();

    let mine_matrix = [];
    let val_matrix = [];

    // fill 'mine_matrix'
    for (let cell_id in open_cells) {
        val_matrix.push(cell_id)
        let b_cell_indexes = open_cells[cell_id];
        let new_array = [];
        new_array.length = border_cells.length + 1;
        new_array.fill(0.0);

        for (let b = 0; b < b_cell_indexes.length; b++) {
            let b_cell_index = b_cell_indexes[b];
            let b_cell = getCellFromId(border_cells[b_cell_index]);

            let val = b_cell.value;
            // -2 : unclicked, -1 : flagged, 0 : no number, 1 - 8 : number
            //console.log("val___---", val);
            if (val == -2 || val == -1) val = 1;
            if (val > 0) val = 1;
            new_array[b_cell_index] = val;
        }
        new_array[new_array.length - 1] = getCellFromId(cell_id).value
        mine_matrix.push(new_array);
    }

    // gaussian elimination
    let columns = mine_matrix[0].length;
    let reduced_mine_matrix = gauss(mine_matrix);


    if (!processMatrix(mine_matrix)){
        processMatrix(reduced_mine_matrix)
    }
    scanBoard()
    let noChanges = true

    for (let cell_id in open_cells) {
        let open_cell = getCellFromId(cell_id);
        let open_cell_value = open_cell.value;
        let safe = false;
         // look at surrounding cells
        for (let b = 0; b < open_cells[cell_id].length; b++) {
            let border_cell = getCellFromId(border_cells[open_cells[cell_id][b]]);
             if (border_cell.value == -1) {
                open_cell_value--;
            }
             // this group of cells is safe
            if (open_cell_value == 0) {
                safe = true;
                break;
            }
        }
         // reveal all other cells
        if (safe) {
            for (let b = 0; b < open_cells[cell_id].length; b++) {
                let bvalue = getCellFromId(border_cells[open_cells[cell_id][b]]).value
                if (bvalue == -2){
                    console.log(`${border_cells[open_cells[cell_id][b]]} is safe. Revealing...`, open_cell.value);
                    clickCell(border_cells[open_cells[cell_id][b]], 0);
                }
            }
        }
    }

    if (JSON.stringify(mine_matrix) != last_mine_matrix) {
        last_mine_matrix = JSON.stringify(mine_matrix);
        return true// calculateMove();
    } else if (!isGameOver()) {
        mine_matrix = "";
        return showProbabilities();
    }
}

let iterations = 0;
let max_moves = 10;
function runAI() {
    if (iterations == 0) clickCell(5,5,0);

    // clear any red cells
    for (let id of min_count) {
        el_cell = getCellFromId(id);
        if (el_cell.element)
            el_cell.element.get(0).classList.remove('highlight');
    }

    while (calculateMove() && iterations < max_moves) {
        iterations++;
        console.log("continue")
    }
}

// "Run AI" button
$('<input type="button" value="Run AI" id="ai" style="margin-left:10px;" /><div id="hovered-cell">...</div>' ).insertAfter($('#display-link')[0]);

$("#ai").on("click", function() {
    prepareAI();
    runAI();
});

$(document).ready(function(){
    $("#game .square").mouseover(function(e){
        $("#hovered-cell").html(e.target.id);
    }).click(function(e){
        prepareAI();
        runAI();
    });
});
