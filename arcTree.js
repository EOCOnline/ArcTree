// or ESM/TypeScript import
//import Ajv from "ajv"
const Verbose = 2; // 0 = none, 1 = some, 2 = all

document.addEventListener("DOMContentLoaded", function () {
    if (Verbose > 1) console.clear();
    //if (Verbose>1) console.log("DOM fully loaded and parsed");
    updateFontSize(document.querySelector("#arctree-font-size"));
    document.getElementById("arctree-file").value = "";
});


/// 'Tree Options' functionality =====================
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
    return fontSize < 0.5 || fontSize > 5;
}

function collapseLeafs() {
    let leafs = document.getElementsByClassName("leaf");
    let leafsLen = leafs.length;
    for (let i = 0; i < leafsLen; i++) {
        leafs[i].style.display = "none";
    }
    if (Verbose) console.log("Collapsed all " + leafsLen + " leafs.");
}

function showLeafs() {
    let leafs = document.getElementsByClassName("leaf");
    let leafsLen = leafs.length;
    for (let i = 0; i < leafsLen; i++) {
        leafs[i].style.display = "block";
    }
    if (Verbose) console.log("Expanded all " + leafsLen + " leafs.");
}

function collapseTree() {
    let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
    let len = checkboxes.length;
    for (let i = 0; i < len; i++) {
        checkboxes[i].checked = "";
    }
    if (Verbose) console.log("Collapsed all " + checkboxes.length + " nodes.");
}

function expandTree() {
    let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
    let len = checkboxes.length;
    for (let i = 0; i < len; i++) {
        checkboxes[i].checked = "checked";
    }
    if (Verbose) console.log("Expanded all " + checkboxes.length + " nodes.");
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
//let nodeHTML.html = "";
//let nodeHTML.log = "";
let DummyUrl = "";
let DummyTreeElement = "";

function clearArcTree(treeElement) {
    treeElement.innerHTML = '';

    // TODO: Need to clear Dummy too?
    //DummyUrl = "";
    //DummyTreeElement = "";

    if (Verbose) console.log("Cleared arctree.");
}

/// Recurse thru a JSON object and build an HTML unordered list matching the JSON structure
function buildArcTree(obj, treeElement, parentUrl = "") {
    if (Verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + parentUrl + "'", "color:DarkOrchid;font-weight:bold;");

    const nodeHTML = {
        treeElement: treeElement,
        parentUrl: parentUrl,
        childUrl: "",
        html: "",
        log: ""
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
        nodeHTML.childUrl = nodeHTML.parentUrl;
        if (Verbose > 1) console.log("Skip object wrapper: " + key);
    } else {
        processTypicalKey(obj, key, nodeHTML);
    }

    if (obj[key] instanceof Object) {
        processObjectKey(obj, key, nodeHTML);
    }
}

function processTypicalKey(obj, key, nodeHTML) {
    nodeHTML.log += key + '=' + obj[key] + ";  ";
    switch (key) {
        case "title":
            nodeHTML.html += "<b>" + obj[key] + "</b>";
            break;
        case "url":
            calcChildUrl(obj, key, nodeHTML);
            nodeHTML.log += "Child URL: " + nodeHTML.childUrl + ";";
            nodeHTML.html += " (<a href='" + nodeHTML.childUrl + "' target='_blank' rel='external' >" + nodeHTML.childUrl + "</a>): ";
            break;
        case "meta":
            nodeHTML.html += "<i> " + obj[key] + "</i>";
            break;
        default:
            nodeHTML.html += " [Unknown key (" + key + ")=" + obj[key] + "] ";
    }
}

function calcChildUrl(obj, key, nodeHTML) {
    // full Urls start with HTTP, relative Urls don't
    if (obj[key].toLowerCase().startsWith("http")) {
        nodeHTML.childUrl = obj[key];
    } else {
        nodeHTML.childUrl = nodeHTML.parentUrl + obj[key];
    }
    if (Verbose > 1) console.log("Child URL: " + nodeHTML.childUrl + ";");

    // No dummy node check for initial node: parentUrl==""
    if (nodeHTML.parentUrl != "") {
        handleDummyUrl(nodeHTML);
    }
}

/**
 * If child URL has 2 or more path segments than the parent URL, create intervening 'dummy' node(s).
 * e.g., with parent https://ibm.com/ & child https://ibm.com/child1/child2 we'll need 
 * to create an intervening https://ibm.com/child1 node.
 * These artificial nodes allow a user to expand/collapse those parts of the list cleanly.
 */
function handleDummyUrl(nodeHTML) {
    console.assert(nodeHTML.childUrl.toLowerCase().startsWith("http"), "childUrl: " + nodeHTML.childUrl + " doesn't start with http!");
    // DummyUrl != "" indicates last emitted list item/node is a 'dummy' URL 

    let parentParts = nodeHTML.parentUrl.toLowerCase().split('/');
    let childParts = nodeHTML.childUrl.toLowerCase().split('/');
    let dummyParts = DummyUrl.toLowerCase().split('/');
    if (Verbose > 1) console.log("parentParts: " + parentParts + "\n childParts: " + childParts + "\n dummyParts: " + dummyParts);

    let iParentPart = 0; // index of the common (highest common denominator) part of parent & child URLs
    while (iParentPart < parentParts.length && iParentPart < childParts.length
        && parentParts[iParentPart] == childParts[iParentPart]) {
        iParentPart++;
    }

    let iDummyPart = 0; // index of the common part of dummy & child URLs
    while (iDummyPart < dummyParts.length && iDummyPart < childParts.length
        && dummyParts[iDummyPart] == childParts[iDummyPart]) {
        iDummyPart++;
    }
    if (Verbose > 1) console.log("iParentPart: " + iParentPart + "; parentParts: " + parentParts + "; childParts: " + childParts + "; iDummy: " + iDummyPart + "; DummyParts = " + dummyParts);

    if (iParentPart >= iDummyPart) {
        if (Verbose > 1) console.log("Use parentURL: " + nodeHTML.parentUrl + " to " + nodeHTML.childUrl);
    } else {
        if (Verbose > 1) console.log("Need to create a dummyURL! " + DummyUrl + "[" + iDummyPart + "] parts to " + nodeHTML.childUrl);
        parentParts = dummyParts;
        treeElement = DummyTreeElement;
    }

    for (let iDummy = parentParts.length + 1; iDummy < childParts.length; iDummy++) {
        // Create a Dummy Node
        if (Verbose) console.log("Dummy #" + (childParts.length - (parentParts.length + 1)) + " needed: " + nodeHTML.parentUrl + " to " + nodeHTML.childUrl);

        let dummyHTML = "<span class='arctree-dummy-node'><b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
        DummyUrl = childParts.slice(0, iDummy).join('/');
        dummyHTML += " (<a href='" + DummyUrl + "' target='_blank' >" + DummyUrl + "</a>): ";
        dummyHTML += "<i>Artificial intermediate node: if URL doesn't exist, you may get 404 errors</i></span>";
        let dummyLog = "Dummy HTML: " + dummyHTML + "; ";
        DummyTreeElement = nodeHTML.treeElement; // Store original treeElement so siblings can be added to it

        if (Verbose) console.group('Dummy node');
        nodeHTML.treeElement = WriteUlListItem({}, nodeHTML.treeElement, dummyHTML, dummyLog);
        if (Verbose > 1) console.log("Added dummy: " + dummyHTML);
        /* NOTE: Needed???
        dummyHTML = "";
        dummyLog = "";
        */
        if (Verbose) console.groupEnd();
    }
}



function processObjectKey(obj, key, nodeHTML) {
    // debugger;
    if (nodeHTML.html != "") {
        // Dump current node before processing children
        nodeHTML.treeElement = WriteUlListItem(obj[key], nodeHTML.treeElement, nodeHTML.html, nodeHTML.log);
        nodeHTML.html = "";
        nodeHTML.log = "";
    }

    let newUL = nodeHTML.treeElement;
    if (obj[key] instanceof Array) {
        newUL = document.createElement('ul');
        // newUL.className = "array"; // or branch - if desired for styling
        nodeHTML.treeElement.appendChild(newUL);
    } else if (obj[key] instanceof Object) {
        // no need to create a new UL for non-arrays
        // newUL = treeElement;
        // newUL.className = "arc-object";
    }

    // Recurse into children
    if (Verbose) console.group("children of " + key);
    buildArcTree(obj[key], newUL, nodeHTML.childUrl);
    if (Verbose) console.groupEnd();

    nodeHTML.childUrl = nodeHTML.parentUrl;
}


/**
 * Reading from the JSON file gets one bit of info sequentially. 
 * We want to write a complete block of HTML (& 1 bebug line) 
 * composed of these bits.
 * So we have been building up parts of the HTML block while 
 * iterating though a JSON node, and can now output the entire 
 * HTML block for that node.
 * 
 * @param {Object} objKey - The current JSON node being processed.
 * @param {HTMLElement} treeElement - The HTML element to which the list item will be appended.
 * @param {string} listLog - The log information for debugging.
 * @returns {HTMLElement} - The new tree element.
 */
function WriteUlListItem(objKey, treeElement, listItemHTML, listLog) {
    if (Verbose > 1) console.log("\n\nEmit caches...");
    if (Verbose) console.log("log: " + listLog);

    let uniqueID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.floor(Math.random() * 1000000).toString();
    let newInput = document.createElement('input');
    newInput.id = "arc" + uniqueID;
    newInput.type = "checkbox";
    newInput.setAttribute('checked', ExpandedByDefault);

    let newLabel = document.createElement('label');
    newLabel.htmlFor = "arc" + DOMPurify.sanitize(uniqueID);
    newLabel.className = "tree-label";
    newLabel.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(listItemHTML) : listItemHTML;  //NOTE: Assume untrusted JSON

    // Or if last leaf (no children), add a leaf class
    // debugger;
    let newLI = document.createElement('li');
    if (Object.keys(objKey).length == 0) {
        newLI.className = "leaf";
        let newSpan = document.createElement('span');
        newSpan.className = "tree-label";
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




/*
function handleKey(key, obj, nodeHTML.html, nodeHTML.log, parentUrl, childUrl, treeElement) {
    switch (key) {
        case "title":
            nodeHTML.html += "<b>" + obj[key] + "</b>";
            break;

        case "url":
            // autodetect whether json is using relative or full urls
            if (obj[key].toLowerCase().startsWith("http")) {
                childUrl = obj[key];
            } else {
                childUrl = parentUrl + obj[key];
            }
            if (Verbose > 1) console.log("Child URL: " + childUrl + ";");

            if (parentUrl != "") {
                console.assert(childUrl.toLowerCase().startsWith("http"), "childUrl: " + childUrl + " didn't start with http!!!");

                if (DummyUrl != "") {
                    // current node is a 'dummy' URL
                }

                let parentParts = parentUrl.toLowerCase().split('/');
                let childParts = childUrl.toLowerCase().split('/');
                let dummyParts = DummyUrl.toLowerCase().split('/');
                if (Verbose > 1) console.log("parentParts: " + parentParts + " childParts: " + childParts + " dummyParts: " + dummyParts);

                let iCommonPart = 0; // index of the common part of parent & child URLs

                while (iCommonPart < parentParts.length && iCommonPart < childParts.length && parentParts[iCommonPart] == childParts[iCommonPart]) {
                    iCommonPart++;
                }

                let iDummyPart = 0; // index of the common part of parent & child URLs

                while (iDummyPart < dummyParts.length && iDummyPart < childParts.length && dummyParts[iDummyPart] == childParts[iDummyPart]) {
                    iDummyPart++;
                }

                if (Verbose > 1) console.log("iCommonPart: " + iCommonPart + "; parentParts: " + parentParts + "; childParts.length: " + childParts.length + "; iDummy: " + iDummyPart);

                if (iCommonPart >= iDummyPart) {
                    if (Verbose > 1) console.log("Use parentURL: " + parentUrl + " to " + childUrl);
                } else {
                    if (Verbose > 1) console.log("Need to create a dummyURL! " + DummyUrl + "[" + iDummyPart + "] parts to " + childUrl);
                    parentParts = dummyParts;
                    debugger;
                    treeElement = DummyTreeElement;
                }

                for (let iDummy = parentParts.length + 1; iDummy < childParts.length; iDummy++) {
                    if (Verbose) console.log("Dummy #" + (childParts.length - (parentParts.length + 1)) + " needed: " + parentUrl + " to " + childUrl);

                    let dummyHTML = "<span class='arctree-dummy-node'><b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
                    DummyUrl = childParts.slice(0, iDummy).join('/');
                    dummyHTML += " (<a href='" + DummyUrl + "' target='_blank' >" + DummyUrl + "</a>): ";
                    dummyHTML += "<i>Artificial intermediate node, URL may not exist & get 404 errors</i></span>";
                    let dummyLog = "Dummy HTML: " + dummyHTML + ";";
                    DummyTreeElement = treeElement;

                    treeElement = WriteUlListItem(obj[key], treeElement, dummyHTML, dummyLog);
                    if (Verbose > 1) console.log("Adding dummy: " + dummyHTML);
                    if (Verbose) console.groupEnd();
                }
            }

            nodeHTML.log += "Child URL: " + childUrl + ";";
            nodeHTML.html += " (<a href='" + childUrl + "' target='_blank' rel='external' >" + childUrl + "</a>): ";
            break;

        case "meta":
            nodeHTML.html += "<i> " + obj[key] + "</i>";
            break;

        default:
            nodeHTML.html += " [Unknown key (" + key + ")=" + obj[key] + "] ";
    }

    return { nodeHTML.html, nodeHTML.log, childUrl, treeElement };
}
*/