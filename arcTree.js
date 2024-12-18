// or ESM/TypeScript import
//import Ajv from "ajv"
const Verbose = 1; // 0 = none, 1 = some, 2 = most, 3 = all

document.addEventListener("DOMContentLoaded", function () {
    if (Verbose > 1) console.clear();
    //if (Verbose>1) console.log("DOM fully loaded and parsed");
    updateFontSize(document.querySelector("#arctree-font-size"));
    document.getElementById("arctree-file").value = "";
});


/// 'ArcTree Options' functionality =====================
function updateFontSize(el) {
    let fontSize = el.value;
    if (!isValidNumber(fontSize) || !isValidFontSize(fontSize)) {
        fontSize = 1;
    }
    document.querySelector(".arctree").style.fontSize = fontSize + 'em';
    document.querySelector("#arctree-font-size-value").innerHTML = fontSize;
    document.querySelector("#arctree-font-size").value = fontSize;
}

function isValidNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function isValidFontSize(fontSize) {
    return fontSize >= 0.5 && fontSize <= 5;
}

function collapseLeafs() {
    let leafs = document.getElementsByClassName("leaf");
    let leafsLen = leafs.length;
    for (let i = 0; i < leafsLen; i++) {
        leafs[i].style.display = "none";
    }
    if (Verbose > 1) console.log("Collapsed all " + leafsLen + " leafs.");
}

function showLeafs() {
    let leafs = document.getElementsByClassName("leaf");
    let leafsLen = leafs.length;
    for (let i = 0; i < leafsLen; i++) {
        leafs[i].style.display = "block";
    }
    if (Verbose > 1) console.log("Expanded all " + leafsLen + " leafs.");
}

function collapseTree() {
    let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
    let len = checkboxes.length;
    for (let i = 0; i < len; i++) {
        checkboxes[i].checked = "";
    }
    if (Verbose > 1) console.log("Collapsed all " + checkboxes.length + " nodes.");
}

function expandTree() {
    let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
    let len = checkboxes.length;
    for (let i = 0; i < len; i++) {
        checkboxes[i].checked = "checked";
    }
    if (Verbose > 1) console.log("Expanded all " + checkboxes.length + " nodes.");
}



/// Import & Validate Json functionality =====================
async function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        let fileReader = new FileReader();
        fileReader.onload = event => {
            try {
                const jsonString = event.target.result;
                const json = JSON.parse(jsonString);
                resolve(json);
            } catch (error) {
                reject(new Error("Invalid JSON format"));
            }
        };
        fileReader.onerror = (error => reject(error));
        fileReader.readAsText(file);
    });
}

async function fileChange(file) {
    readJSONFile(file).then(
        json => {
            console.log("%c" + "\n================\nRead new Json file: " + file.name + " with " + file.size + " char (" + (file.size / 1024).toFixed(1) + " KB)", "color:maroon;font-weight:bold;");
            if (!validateJson(json)) {
                console.error("Invalid JSON: " + json);
                alert("Invalid JSON: " + json);
                return;
            }
            clearArcTree(document.getElementById('unordered-arctree'));
            try {
                buildArcTree(json, document.getElementById('unordered-arctree'));
            } catch (e) {
                console.error("Error building ArcTree: " + e.message);
            }
        }
    ).catch(error => {
        console.error("Error reading JSON file: " + error.message);
        alert("Error reading JSON file (" + file.name + "): \n" + error.message);
    });
}

function validateJson(json) {
    try {
        if (typeof json !== 'object' || json === null) {
            throw new Error("Invalid JSON structure: Expected an object.");
        }
    } catch (e) {
        console.error("Invalid JSON structure: " + e.message);
        return false;
    }
    if (Verbose > 1) console.log("JSON validated");
    return true;
}


// https://ajv.js.org/guide/getting-started.html#basic-data-validation
// https://www.npmjs.com/package/ajv

// ADVANCED VALIDATION OPTION:
/*
const Ajv = require("ajv")

let ajvOptions = "";
if (Verbose>1) ajvOptions = "allErrors: true";
const ajv = new Ajv(ajvOptions)
 
const schema = {
  type: "object",
  properties: {
    foo: { type: "integer" },
    bar: { type: "string" },
  },
  required: ["foo"],
  additionalProperties: false,
}
 
const schema2 = {
  type: "object",
  properties: {
    title: { type: "string" },
    url: { type: "string" },
    meta: { type: "string" },
    children: { type: "object" },
  },
  required: ["title"],
  additionalProperties: false,
}
 
const data = {
  foo: 1,
  bar: "abc",
}
 
const data2 = {
  title: "test title",
  url: "test url",
  meta: "test meta",
  children: {
    title: "test title",
    url: "test url",
    meta: "test meta",
    },
}
*/



/// Tree Creation functionality =====================
const ExpandedByDefault = "checked";
let DummyUrl = "";
let DummyTreeElement = "";

function clearArcTree(treeElement) {
    treeElement.innerHTML = '';
    if (Verbose > 1) console.log("Cleared arctree.");
}

/// Recurse thru a JSON object and build an HTML unordered list matching the JSON structure
function buildArcTree(obj, treeElement, parentUrl = "") {
    if (Verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + parentUrl + "'", "color:DarkOrchid;font-weight:bold;");

    const nodeHTML = {
        treeElement: treeElement,
        parentUrl: parentUrl,
        childUrl: "",
        html: ""
    }

    for (let key in obj) {
        if (Verbose > 1) console.log("processing: '" + key.toString() + "' = '" + obj[key] + "'");
        processKey(obj, key, nodeHTML);
    }
}

function processKey(obj, key, nodeHTML) {
    if (obj[key] instanceof Array) {
        if (key == "children") {
            if (Verbose > 1) console.log("Got array with " + Object.keys(obj[key]).length + " children...");
        } else {
            console.warn("Got unexpected non-child array: " + obj[key]);
        }
    } else if (obj[key] instanceof Object) {
        // Skip object wrapper at this point
        nodeHTML.childUrl = nodeHTML.parentUrl;
    } else {
        processTypicalKey(obj, key, nodeHTML);
    }

    if (obj[key] instanceof Object) {
        processObjectKey(obj[key], nodeHTML);
    }
}

function processTypicalKey(obj, key, nodeHTML) {
    switch (key) {
        case "title":
            nodeHTML.html += "<b>" + obj[key] + "</b>";
            break;
        case "url":
            calcChildUrl(obj[key], nodeHTML);
            nodeHTML.html += " (<a href='" + nodeHTML.childUrl + "' target='_blank' rel='external' >" + nodeHTML.childUrl + "</a>): ";
            break;
        case "meta":
            nodeHTML.html += "<i> " + obj[key] + "</i>";
            break;
        default:
            nodeHTML.html += " [Unknown key (" + key + ")=" + obj[key] + "] ";
    }
}

function calcChildUrl(objKey, nodeHTML) {
    // full Urls start with HTTP, relative Urls don't
    if (objKey.toLowerCase().startsWith("http")) {
        nodeHTML.childUrl = objKey;
    } else {
        nodeHTML.childUrl = nodeHTML.parentUrl + objKey;
    }
    if (Verbose > 1) console.log("Child URL: " + nodeHTML.childUrl + ";");

    // Check for dummy nodes -- except for initial node: parentUrl==""
    if (nodeHTML.parentUrl != "") {
        handleDummyUrl(objKey, nodeHTML);
    }
}

/**
 * If child URL has 2 or more path segments than the parent URL, create intervening 'dummy' node(s).
 * e.g., with parent https://ibm.com/ & child https://ibm.com/child1/child2 we'll need 
 * to create an intervening https://ibm.com/child1 node.
 * These artificial nodes allow a user to expand/collapse those parts of the list cleanly.
 */
function handleDummyUrl(objKey, nodeHTML) {
    console.assert(nodeHTML.childUrl.toLowerCase().startsWith("http"), "childUrl: " + nodeHTML.childUrl + " doesn't start with http!");

    let childParts = nodeHTML.childUrl.toLowerCase().split('/');

    let iParentPart = 0; // index of the common (highest common denominator) part of parent & child URLs
    let parentParts = nodeHTML.parentUrl.toLowerCase().split('/');
    while (iParentPart < parentParts.length && iParentPart < childParts.length
        && parentParts[iParentPart] == childParts[iParentPart]) {
        iParentPart++;
    }
    iParentPart--; // back up to last common part

    let iDummyPart = 0; // index of the common part of dummy & child URLs
    let dummyParts = [];
    if (DummyUrl != "") {
        // Last emitted list item had a 'dummy' URL. Is it a better starting point vs. the parentURL
        dummyParts = DummyUrl.toLowerCase().split('/');
        while (iDummyPart < dummyParts.length && iDummyPart < childParts.length
            && dummyParts[iDummyPart] == childParts[iDummyPart]) {
            iDummyPart++;
        }
        iDummyPart--; // back up to last common part    
    }

    if (Verbose > 2) console.log(parentParts.length + " parentParts: " + parentParts + "\n" + childParts.length + " childParts: " + childParts + "\n" + dummyParts.length + " dummyParts: " + dummyParts);
    if (iParentPart >= iDummyPart) {
        if (Verbose > 2) console.log("Using parentURL: " + nodeHTML.parentUrl + " to build " + nodeHTML.childUrl);
    } else {
        if (Verbose > 2) console.log("Using (last) dummyURL: " + dummyParts[iDummyPart] + " and " + nodeHTML.childUrl);
        parentParts = dummyParts;
        nodeHTML.treeElement = DummyTreeElement;
    }

    for (let iDummy = parentParts.length + 1; iDummy < childParts.length; iDummy++)
        createDummyListItem(objKey, nodeHTML, childParts, parentParts, iDummy);
}

function createDummyListItem(objKey, nodeHTML, childParts, parentParts, iDummy) {
    if (Verbose > 1) console.log("Creating Dummy #" + (childParts.length - (parentParts.length + 1)) + " between " + nodeHTML.parentUrl + " & " + nodeHTML.childUrl);

    // arctree-dummy-node must be 1st class to override arctree-label (or chg css)
    let dummyHTML = "<span class='arctree-dummy-node arctree-label'><b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
    //let dummyHTML = "<b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
    DummyUrl = childParts.slice(0, iDummy).join('/');
    dummyHTML += " (<a href='" + DummyUrl + "' target='_blank' rel='external'>" + DummyUrl + "</a>): ";
    dummyHTML += "<i>Artificial intermediate node (The URL may not exist, leading to 404-type errors)</i>";

    if (Verbose) console.group('Dummy node');
    nodeHTML.treeElement = AppendLlListItem(objKey, nodeHTML.treeElement, dummyHTML);
    DummyTreeElement = nodeHTML.treeElement; // Store original treeElement so siblings can be added to it
    // if (Verbose > 2) AppendLlListItem({}, nodeHTML.treeElement, "<span>subsequent DummyTreeElements will attach here</span>");
    if (Verbose) console.groupEnd();

    //newUL = document.createElement('ul');
    //nodeHTML.treeElement = nodeHTML.treeElement.appendChild(newUL);

    //let newUL = nodeHTML.treeElement;
    if (objKey instanceof Array) {
        console.error("\n\n\nArray should not have children: " + objKey);
        //newUL = document.createElement('ul');
        // newUL.className = "array"; // or branch - if desired for styling
        //nodeHTML.treeElement = nodeHTML.treeElement.appendChild(newUL);
    }
    newUL = document.createElement('ul');
    newUL.className = "arctree-dummy-ul";
    nodeHTML.treeElement = nodeHTML.treeElement.appendChild(newUL);
    DummyTreeElement = nodeHTML.treeElement
}

function processObjectKey(objKey, nodeHTML) {
    if (nodeHTML.html != "") {
        // Dump current node before processing children
        //nodeHTML.html = "<span class='arctree-label'>" + nodeHTML.html + "</span>";
        nodeHTML.treeElement = AppendLlListItem(objKey, nodeHTML.treeElement, nodeHTML.html);
        nodeHTML.html = "";
    }

    let newUL = nodeHTML.treeElement;
    if (objKey instanceof Array) {
        newUL = document.createElement('ul');
        // newUL.className = "array"; // or branch - if desired for styling
        nodeHTML.treeElement.appendChild(newUL);
    } else if (objKey instanceof Object) {
        // no need to create a new UL for non-arrays
        // newUL = treeElement;
        // newUL.className = "arctree-object";
    }

    // Recurse into children
    if (Verbose) console.group("children of " + nodeHTML.childUrl);
    buildArcTree(objKey, newUL, nodeHTML.childUrl);
    if (Verbose) console.groupEnd();

    nodeHTML.childUrl = nodeHTML.parentUrl;
    // TODO: Is this needed somewhere?: DummyTreeElement = "";
}


/**
 * Reading from the JSON file gets one bit of info sequentially. 
 * We want to write a complete block of HTML composed of these bits.
 * So we have been building up parts of the HTML block while 
 * iterating though a JSON node, and can now output the entire 
 * HTML block for that node.
 * 
 * @param {Object} objKey - The current JSON node being processed. Use {} to just generate a leaf node.
 * @param {HTMLElement} treeElement - The HTML element to which the list item will be appended.
 * @param {string} listItemHTML - The HTML block to be appended to the treeElement.
 * @returns {HTMLElement} - The new tree element.
 */

function AppendLlListItem(objKey, treeElement, listItemHTML) {
    if (Verbose) console.log("%c\nEmit " + objKey + " with HTML: " + listItemHTML, "color:DarkGreen;font-weight:bold;");

    let uniqueID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.floor(Math.random() * 1000000).toString();
    let newInput = document.createElement('input');
    newInput.id = "arctree_" + uniqueID;
    newInput.type = "checkbox";
    newInput.setAttribute('checked', ExpandedByDefault);

    let newLabel = document.createElement('label');
    newLabel.htmlFor = "arctree_" + uniqueID;
    newLabel.className = "arctree-label";
    newLabel.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(listItemHTML) : listItemHTML;  //NOTE: Assume untrusted JSON

    // Or if last leaf (no children), add a leaf class
    let newLI = document.createElement('li');
    if (Object.keys(objKey).length == 0) {
        newLI.className = "leaf";
        let newSpan = document.createElement('span');
        newSpan.className = "arctree-label";
        newSpan.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(listItemHTML) : listItemHTML  //NOTE: Assume untrusted JSON
        newLI.appendChild(newSpan);
    }
    treeElement.appendChild(newLI);

    if (Object.keys(objKey).length > 0) {
        newLI.appendChild(newInput);
        newLI.appendChild(newLabel);
    }
    return newLI; // becomes next treeElement
}
