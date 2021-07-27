/* content.js
 * 
 * Look Later content script
 * 
 * updated 020-07-08
 */
"use strict"
const DEBUG = true;
 
/* debug_dump() is a debugging function that spits out its arguments
* properties and functions to the console in a particular way.
*/
function debug_dump(obj) {
    let eltz    = [];
    let empties = [];
    let funx    = [];
    for(let k in obj) {
        let v = obj[k];
        if (v === null) empties.push(k);
        else if(v == "") empties.push(k);
        else if(typeof(v) == "function") funx.push(k);
        else eltz.push(`${k}: <${typeof(v)}> ${String(v)}`);
    }
    let output = [
        `<${typeof(obj)}> ${String(obj)}\n\t`,
        eltz.join("\n\t"),
        "\n\tfunctions:\n\t",
        funx.join(', '),
        "\n\tempties:\n\t",
        empties.join(", ")
    ]
    
    console.log(output.join(""));
}

/* buttle_up_to_a(elt) returns the <A> element closest to elt in the DOM tree
 * that contains elt (or null if elt is not inside an <A> element).
 * 
 * This is necessary because if the "contextmenu" event handler fires on
 * an element contained in an <A> element, the event.target will be the
 * contained element, and not the <A>. We will need to bubble up the DOM
 * tree until we find the containing <A> so we can extract its href.
 */
function bubble_up_to_a(elt) {
    let x = elt;
    while (true) {
        if (x.tagName == "A") { return x;
        } else if (x.tagName == "BODY") { return null;
        } else { x = x.parentElement; }
    }
}

/* on_c_menu(evt) sends information about the <A> tag containing the element
 * upon which the context menu is invoked to the background script.
 * 
 * Without this, the background script would have no information about the
 * link the user is trying to store when the "Store for Look Later" context
 * menu item is selected.
 */
function on_c_menu(evt) {
    if(DEBUG) {
        console.log("LL: on_c_menu(evt) called; evt:");
        debug_dump(evt);
    }
    
    let a = bubble_up_to_a(evt.target);
    
    if (a) {
        if(DEBUG) console.log(`LL: on_c_menu(...): found A element: "${a.href}"`);
        let msg_obj = {
            href: a.href,
            text: evt.target.innerText,
            origin: window.location.host + window.location.pathname,
            timestamp: Date.now()
        };
        
        chrome.runtime.sendMessage({type: "link", payload: msg_obj});
        if(DEBUG) {
            console.log("Sent message:");
            debug_dump(msg_obj);
        }
        
    } else {
        if(DEBUG) console.log(`LL: on_c_menu(...) no A element found!`);
    }
}

if(DEBUG) console.log("LL: Content script starts.");

document.addEventListener("contextmenu", on_c_menu);

if(DEBUG) console.log("LL: Content script ends.")
