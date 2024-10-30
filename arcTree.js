// or ESM/TypeScript import
//import Ajv from "ajv"
const Verbose = 2;

document.addEventListener("DOMContentLoaded", function () {
    if (Verbose > 1) console.clear();
    //if (Verbose>1) console.log("DOM fully loaded and parsed");
    setFontSize(document.querySelector("#arctree-font-size"));
    document.getElementById("arctree-file").value = "";
});



/// 'Tree Options' functionality =====================
function setFontSize(el) {
    let fontSize = el.value;
    if (!isNumber(fontSize) || fontSize < 0.5 || fontSize > 5) {
        fontSize = 1;
    }
    document.querySelector(".arctree").style.fontSize = fontSize + 'em';
    document.querySelector("#arctree-font-size-value").innerHTML = fontSize;
    document.querySelector("#arctree-font-size").value = fontSize;
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
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
            resolve(JSON.parse(event.target.result))
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
            buildArcTree(json, document.getElementById('unordered-arctree'));
        }
    ).catch(
        error => console.error("Error reading file: " + error)
    );
}

function validateJson(json) {
    try {
        if (typeof json !== 'object' || json === null) {
            throw new Error("Invalid JSON object");
        }
    } catch (e) {
        console.error("Invalid JSON: " + e);
        return false;
    }
    if (Verbose > 1) console.log("json validated")
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
let ListItemHTML = "";
let ListLog = "";
let DummyUrl = "";
let DummyTreeElement = "";

function clearArcTree(treeElement) {
    while (treeElement.firstChild) {
        treeElement.removeChild(treeElement.firstChild);
    }

    // Reset global variables
    ListItemHTML = "";
    ListLog = "";
    DummyUrl = "";
    DummyTreeElement = "";

    if (Verbose) console.log("Cleared tree.");
}

/// Recurse thru a JSON object and build an HTML unordered list matching the JSON structure
function buildArcTree(obj, treeElement, parentUrl = "") {
    if (Verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + parentUrl + "'", "color:DarkOrchid;font-weight:bold;");
    let childUrl = "";
    for (let key in obj) {
        if (Verbose > 1) console.log("processing: '" + key.toString() + "' = '" + obj[key] + "'");
        processKey(obj, key, treeElement, parentUrl, childUrl);
    }
}

function processKey(obj, key, treeElement, parentUrl, childUrl) {
    if (obj[key] instanceof Array) {
        if (key == "children") {
            if (Verbose > 1) console.log("Got array with " + Object.keys(obj[key]).length + " children...");
        } else {
            console.warn("Got unexpected non-child array: " + obj[key]);
        }
    } else if (obj[key] instanceof Object) {
        childUrl = parentUrl;
        if (Verbose > 1) console.log("Skip object wrapper: " + key);
    } else {
        processTypicalKey(obj, key, treeElement, parentUrl, childUrl);
    }
    if (obj[key] instanceof Object) {
        processObjectKey(obj, key, treeElement, parentUrl, childUrl);
    }
}

function processTypicalKey(obj, key, treeElement, parentUrl, childUrl) {
    ListLog += key + '=' + obj[key] + ";  ";
    switch (key) {
        case "title":
            ListItemHTML += "<b>" + obj[key] + "</b>";
            break;
        case "url":
            processUrlKey(obj, key, treeElement, parentUrl, childUrl);
            break;
        case "meta":
            ListItemHTML += "<i> " + obj[key] + "</i>";
            break;
        default:
            ListItemHTML += " [Unknown key (" + key + ")=" + obj[key] + "] ";
    }
}

function processUrlKey(obj, key, treeElement, parentUrl, childUrl) {
    if (obj[key].toLowerCase().startsWith("http")) {
        // full Urls
        childUrl = obj[key];
    } else {
        // relative Urls
        childUrl = parentUrl + obj[key];
    }
    if (Verbose > 1) console.log("Child URL: " + childUrl + ";");

    // No dummy node check needed for initial node (parentUrl = "")
    if (parentUrl != "") {
        handleDummyUrl(treeElement, parentUrl, childUrl);
    }
    ListLog += "Child URL: " + childUrl + ";";
    ListItemHTML += " (<a href='" + childUrl + "' target='_blank' rel='external' >" + childUrl + "</a>): ";
}

/// If child URL has 2 or more path segments than the parent URL, create intervening 'dummy' node(s).
// e.g., https://ibm.com/ to https://ibm.com/child1/child2 -- without going thru https://ibm.com/child1 first.
/// These artificial nodes allow a user to expand/collapse those parts of the list cleanly.
function handleDummyUrl(treeElement, parentUrl, childUrl) {
    console.assert(childUrl.toLowerCase().startsWith("http"), "childUrl: " + childUrl + " didn't start with http!!!");
    // DummyUrl != "" indicates last emitted list item/node is a 'dummy' URL 

    let parentParts = parentUrl.toLowerCase().split('/');
    let childParts = childUrl.toLowerCase().split('/');
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
    if (Verbose > 1) console.log("iCommonPart: " + iParentPart + "; parentParts: " + parentParts + "; childParts.length: " + childParts.length + "; iDummy: " + iDummyPart);

    if (iParentPart < iDummyPart) {
        createDummyNodes(treeElement, parentParts, childParts, dummyParts);
    }
}

function createDummyNodes(treeElement, parentParts, childParts, dummyParts) {
    debugger;
    parentParts = dummyParts;
    for (let iDummy = parentParts.length + 1; iDummy < childParts.length; iDummy++) {

        let dummyHTML = "<span class='arctree-dummy-node'><b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
        DummyUrl = childParts.slice(0, iDummy).join('/');
        dummyHTML += " (<a href='" + DummyUrl + "' target='_blank' >" + DummyUrl + "</a>): ";
        dummyHTML += "<i>Artificial intermediate node, URL may not exist & get 404 errors</i></span>";
        let dummyLog = "Dummy HTML: " + dummyHTML + ";";

        DummyTreeElement = treeElement;
        if (Verbose) console.group('Dummy node');
        treeElement = WriteUlListItem({}, treeElement, dummyHTML, dummyLog);
        if (Verbose > 1) console.log("Added dummy: " + dummyHTML);
        if (Verbose) console.groupEnd();
    }
}

function processObjectKey(obj, key, treeElement, parentUrl, childUrl) {
    if (ListItemHTML != "") {
        treeElement = WriteUlListItem(obj[key], treeElement, ListItemHTML, ListLog);
        ListItemHTML = "";
        ListLog = "";
    }
    let newUL = treeElement;
    if (obj[key] instanceof Array) {
        newUL = document.createElement('ul');
        treeElement.appendChild(newUL);
    }
    if (Verbose) console.group("children of " + key);
    buildArcTree(obj[key], newUL, childUrl);
    if (Verbose) console.groupEnd();
    childUrl = parentUrl;
}

if (Verbose > 1) console.log("Emit caches...");
// Output list item we've been building up before processing children
if (Verbose) console.log("log: " + listLog);

let newLI = document.createElement('li');

/**
 * Writes a list item to the tree element.
 * 
 * @param {Object} objKey - The current JSON node being processed.
 * @param {HTMLElement} treeElement - The HTML element to which the list item will be appended.
 * @param {string} listLog - The log information for debugging.
 * @returns {HTMLElement} - The updated tree element.
 */
function WriteUlListItem(objKey, treeElement, listItemHTML, listLog) {
    let uniqueID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.floor(Math.random() * 1000000).toString();
    let newInput = document.createElement('input');
    newInput.id = "c" + uniqueID;
    newInput.type = "checkbox";
    newInput.setAttribute('checked', ExpandedByDefault);

    let newLabel = document.createElement('label');
    newLabel.htmlFor = "c" + DOMPurify.sanitize(uniqueID);
    newLabel.className = "tree-label";
    newLabel.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(listItemHTML) : listItemHTML;  //NOTE: Assume untrusted JSON

    // Or if last leaf (no children), add a leaf class
    if (Object.keys(objKey).length == 0) {
        newLI.className = "leaf";
        let newSpan = document.createElement('span');
        newSpan.className = "tree-label";
        newSpan.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON
        newLI.appendChild(newSpan);
    }
    treeElement.appendChild(newLI);

    if (Object.keys(objKey).length > 0) {
        newLI.appendChild(newInput);
        newLI.appendChild(newLabel);
    }
    treeElement = newLI;
    return treeElement;
}




/*
function handleKey(key, obj, ListItemHTML, ListLog, parentUrl, childUrl, treeElement) {
    switch (key) {
        case "title":
            ListItemHTML += "<b>" + obj[key] + "</b>";
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

            ListLog += "Child URL: " + childUrl + ";";
            ListItemHTML += " (<a href='" + childUrl + "' target='_blank' rel='external' >" + childUrl + "</a>): ";
            break;

        case "meta":
            ListItemHTML += "<i> " + obj[key] + "</i>";
            break;

        default:
            ListItemHTML += " [Unknown key (" + key + ")=" + obj[key] + "] ";
    }

    return { ListItemHTML, ListLog, childUrl, treeElement };
}
*/