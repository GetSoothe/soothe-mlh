// takes corpus of offensive words by category and concats them all to object of regex searches for offensive words
function generateTriggerRegexes(triggersObject) {
  var triggers_regex = {};
  for(var i in triggersObject) {
    var regexStr = '\\b(' + triggersObject[i].join('|') + ')\\b';
    triggers_regex[i] = new RegExp(regexStr);
  }
  return triggers_regex
}

// {violence : _regex_, racist : _regex_}
var triggers_regex = generateTriggerRegexes(TRIGGERS);

chrome.storage.local.get(['activeFilterTypes'], function (arrayOfFilterTypes) {
	for (var triggerType in triggers_regex) {
		if (arrayOfFilterTypes.activeFilterTypes.indexOf(triggerType) === -1) {
			delete triggers_regex[triggerType];
		}
	}
});

function checkContainsHarasment (text, triggers_regex) {
  for(var i in triggers_regex) {
    if(text.match(triggers_regex[i])) {
      return true;
    }
  }
  return false;
}





/*
-----------------------------------------
FILTERING FUNCTIONS ARE BELOW...
-----------------------------------------
*/
function findOffensiveNodes(node, avoidRecurse) {

  // validate node
  if(!node || !node.parentElement){
    return NodeFilter.FILTER_REJECT;
  }

  // check if inside a script elements
  var ignoreElemTypes = ['SCRIPT', 'INPUT', 'TEXTAREA'];
  if(ignoreElemTypes.indexOf(node.parentElement.nodeName) !== -1) {
    return NodeFilter.FILTER_REJECT;
  }

  // validate that its not editableElems
  if(node.isContentEditable) {
    return NodeFilter.FILTER_REJECT;
  }

  // check that it's not hidden
  var hiddenDisp = ['hidden', 'none'];
  if(hiddenDisp.indexOf(window.getComputedStyle(node.parentElement).display) != -1) {
    return NodeFilter.FILTER_REJECT;
  }

  // filter out messages that don't contain harrasmenet
  if(!checkContainsHarasment(node.textContent||node.innerText, triggers_regex)) {
    return NodeFilter.FILTER_REJECT;
  }

  // filter for children that satis
  if(!avoidRecurse) {
    var hasEncChild = Array.prototype.reduce.call(node.childNodes, function (bool, childElem) {
      var filtVal = findOffensiveNodes(childElem, true);
      var validChild = (filtVal === NodeFilter.FILTER_ACCEPT && childElem.childElementCount);
      return bool || validChild;
    }, false);
    if(hasEncChild) {
      return NodeFilter.FILTER_SKIP;
    }
  }

  return NodeFilter.FILTER_ACCEPT;
}


function iterateOffensiveNodes(startElem, handler) {
 if(!(startElem instanceof Node)) return;
 var walker = document.createTreeWalker(startElem, NodeFilter.SHOW_ELEMENT, {
   acceptNode : findOffensiveNodes
 }, true);
 while(walker.nextNode()) {
   while(walker.firstChild()){}
   //debugger;
   handler(walker.currentNode);
 }
}
