/* options.js
 * 
 * Look Later options menu script
 * 
 * updated 2020-07-14
 */
 
const STORAGE = chrome.storage.local;

const DEFAULT_FONT = "sans-serif";
const DEFAULT_SIZE = 75;

const FONT = document.getElementById("font");
const SIZE = document.getElementById("size");
const SIZE_OUTPUT = document.getElementById("sd");

function load_prefs() {
    STORAGE.get("prefs", function(itemz) {
        if(chrome.runtime.lastError) {
            console.log(`Error loading preferences: ${chrome.runtime.lastError}`);
            return;
        }
        
        let prefz = itemz.prefs;
        if (prefz) {
            FONT.value = prefz.font;
            SIZE.value = prefz.size;
            SIZE_OUTPUT.value = prefz.size.toString() + "%";
        } else {
            FONT.value = DEFAULT_FONT;
            SIZE.value = DEFAULT_SIZE;
            SIZE_OUTPUT.value = DEFAULT_SIZE.toString(); + "%";
        }
    });
}

function update_prefs() {
    let font = FONT.value;
    let size = SIZE.value;
    
    let prefz = { "font": font, "size": size };
    STORAGE.set({ "prefs": prefz }, function() {
        if (chrome.runtime.lastError) {
            console.log(`Error saving preferences: ${chrome.runtime.lastError}`);
            return;
        }
        
        SIZE_OUTPUT.value = size.toString() + "%";
    });
}

window.addEventListener("load", load_prefs);
FONT.addEventListener("change", update_prefs);
SIZE.addEventListener("input", update_prefs);

