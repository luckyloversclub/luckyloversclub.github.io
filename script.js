// Function to convert image URLs to Roll20 format
function convertImageUrl(url) {
    if (url.startsWith('https://i.imgur.com/')) {
        return `https://imgsrv.roll20.net/?src=${encodeURIComponent(url)}`;
    }
    return url;
}

// Function to extract unique image URLs from HTML
function extractUniqueImageUrls(html) {
    console.log('Extracting unique image URLs');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const messages = doc.querySelectorAll('.message');
    const uniqueAvatars = new Map(); // Map to store username -> avatar URL
    
    messages.forEach(message => {
        const avatar = message.querySelector('.avatar img');
        const username = message.querySelector('.by')?.textContent;
        if (avatar && avatar.src && username) {
            console.log(`Found avatar for ${username}:`, avatar.src);
            uniqueAvatars.set(username, avatar.src);
        }
    });
    
    console.log('Total unique avatars found:', uniqueAvatars.size);
    return uniqueAvatars;
}

// Function to create image replacement interface
function createImageReplacementInterface(uniqueAvatars) {
    console.log('Creating image replacement interface with avatars:', uniqueAvatars);
    const container = document.getElementById('imageReplacements');
    const list = document.getElementById('imageReplacementList');
    list.innerHTML = '';
    
    if (uniqueAvatars.size === 0) {
        console.log('No unique avatars found, hiding container');
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // Create a map to store input elements for each username
    const inputMap = new Map();
    
    uniqueAvatars.forEach((url, username) => {
        console.log(`Creating interface for ${username} with URL: ${url}`);
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        
        const label = document.createElement('label');
        label.textContent = `${username}: `;
        label.style.marginRight = '10px';
        label.style.fontWeight = 'bold';
        
        const originalInput = document.createElement('input');
        originalInput.type = 'text';
        originalInput.value = url;
        originalInput.readOnly = true;
        originalInput.style.width = '300px';
        originalInput.style.marginRight = '10px';
        
        const replacementInput = document.createElement('input');
        replacementInput.type = 'text';
        replacementInput.placeholder = '새 아이콘 URL';
        replacementInput.style.width = '300px';
        
        div.appendChild(label);
        div.appendChild(originalInput);
        div.appendChild(replacementInput);
        list.appendChild(div);
        
        // Store the input elements in the map
        inputMap.set(username, {
            original: originalInput,
            replacement: replacementInput
        });
    });

    console.log('Input map created:', inputMap);

    // Add event listener for the global icon change button
    document.getElementById('changeAllIcons').onclick = function() {
        console.log('Change all icons button clicked');
        const outputDiv = document.getElementById("output");
        let currentHtml = outputDiv.innerHTML;
        console.log('Current output HTML length:', currentHtml.length);
        let hasChanges = false;
        
        // Process each input pair
        inputMap.forEach((inputs, username) => {
            const { original, replacement } = inputs;
            console.log(`Processing ${username}:`, {
                originalUrl: original.value,
                replacementUrl: replacement.value
            });
            
            if (replacement.value.trim()) {
                console.log(`Found replacement for ${username}`);
                hasChanges = true;
                const newUrl = replacement.value.trim();
                
                // Create a temporary div to parse the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentHtml;
                
                // Find all messages by this author
                const messages = tempDiv.querySelectorAll('.message');
                messages.forEach(message => {
                    const messageAuthor = message.querySelector('.by')?.textContent;
                    if (messageAuthor === username) {
                        // Find the avatar image in this message
                        const avatar = message.querySelector('.avatar img');
                        if (avatar) {
                            console.log(`Updating avatar for ${username} in message`);
                            avatar.src = newUrl;
                        }
                    }
                });
                
                // Update the HTML with the modified content
                currentHtml = tempDiv.innerHTML;
                
                // Update the original input with the new URL
                original.value = newUrl;
                // Clear the replacement input
                replacement.value = '';
                console.log(`Updated ${username} with new URL: ${newUrl}`);
            }
        });
        
        if (hasChanges) {
            console.log('Changes detected, updating output');
            // Update the output with the processed HTML
            outputDiv.innerHTML = currentHtml;
            
            // Update the uniqueAvatars map with new URLs from the output
            uniqueAvatars.clear();
            const newImages = outputDiv.querySelectorAll('.avatar img');
            console.log('Found new images in output:', newImages.length);
            
            newImages.forEach(img => {
                const username = img.closest('.message').querySelector('.by')?.textContent;
                if (username) {
                    uniqueAvatars.set(username, img.src);
                    console.log(`Updated uniqueAvatars for ${username}:`, img.src);
                    // Update the original input value if it exists in the map
                    const inputs = inputMap.get(username);
                    if (inputs) {
                        inputs.original.value = img.src;
                        console.log(`Updated input value for ${username}:`, img.src);
                    }
                }
            });
        } else {
            console.log('No changes detected');
        }
    };
}

// Helper: Convert rollresult message to styled HTML
function convertRollResultMessage(message) {
    // Extract data attributes and classes
    const originalClasses = Array.from(message.classList).join(' ');
    const playerid = message.dataset.playerid || '';
    const messageid = message.dataset.messageid || '';
    // Outer div style
    const outerStyle = 'box-sizing: content-box; padding-left: 45px; padding-right: 16px; padding-bottom: 7px; margin-top: 0; background-color: rgb(241, 241, 241); position: relative; color: rgb(51, 51, 51); font-family: "Proxima Nova", ProximaNova-Regular, -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; font-size: 13.65px;';
    let html = `<div class=\"message ${originalClasses}\" data-messageid=\"${messageid}\" data-playerid=\"${playerid}\" style=\"${outerStyle}\">`;
    // --- Player avatar and name (if present) ---
    const avatar = message.querySelector('.avatar');
    if (avatar) {
        const img = avatar.querySelector('img');
        if (img) {
            html += `<div class=\"avatar\" aria-hidden=\"true\" style=\"box-sizing: content-box; position: absolute; top: 10px; left: 5px; width: 28px;\"><img src=\"${img.src}\" style=\"box-sizing: content-box; border: 0px; vertical-align: middle; max-width: 28px; height: auto; max-height: 28px;\"></div>`;
        }
    }
    const by = message.querySelector('.by');
    if (by) {
        html += `<span class=\"by\" style=\"box-sizing: content-box; font-weight: bold; position: relative; left: -5px;\">${by.textContent}</span>`;
    }
    // --- Formula ---
    const formula = message.querySelector('.formula:not(.formattedformula)');
    if (formula) {
        html += `<div class=\"formula\" style=\"box-sizing: content-box; display: inline; padding: 4px; background: white; border-radius: 3px; border: 1px solid rgb(209, 209, 209); font-size: 1.1em; line-height: 2em; overflow-wrap: break-word; margin-bottom: 3px;\">${formula.textContent}</div>`;
    }
    // --- Clear ---
    html += `<div class=\"clear\" style=\"box-sizing: content-box; clear: both;\"></div>`;
    // --- Dicegrouping ---
    const formatted = message.querySelector('.formula.formattedformula');
    if (formatted) {
        html += `<div class=\"formula formattedformula\" style=\"box-sizing: content-box; padding: 0px 4px; background: white; border-radius: 3px; border: 1px solid rgb(209, 209, 209); font-size: 1.1em; line-height: 2em; overflow-wrap: break-word; float: left; margin: 5px 0px;\">`;
        const dicegrouping = formatted.querySelector('.dicegrouping');
        if (dicegrouping) {
            html += `<div class=\"dicegrouping\" data-groupindex=\"${dicegrouping.dataset.groupindex || ''}\" style=\"box-sizing: content-box; display: inline;\">`;
            Array.from(dicegrouping.childNodes).forEach(node => {
                if (node.nodeType === 3) {
                    // Text node (operator, parens, etc.)
                    let text = node.textContent;
                    if (text.trim()) {
                        html += text;
                    }
                } else if (node.nodeType === 1 && node.classList && node.classList.contains('diceroll')) {
                    // Dice roll
                    const dicerollClass = node.className;
                    const origindex = node.dataset.origindex || '';
                    html += `<div data-origindex=\"${origindex}\" class=\"${dicerollClass}\" style=\"box-sizing: content-box; display: inline-block; font-size: 1.2em;\">`;
                    const dicon = node.querySelector('.dicon');
                    if (dicon) {
                        html += `<div class=\"dicon\" style=\"box-sizing: content-box; display: inline-block; min-width: 30px; text-align: center; position: relative;\">`;
                        const didroll = dicon.querySelector('.didroll');
                        if (didroll) {
                            let color = 'black';
                            let fontWeight = '';
                            if (didroll.style && didroll.style.color) {
                                color = didroll.style.color;
                            } else if (node.classList.contains('critfail')) {
                                color = 'rgb(115, 5, 5)';
                                fontWeight = 'font-weight: bold;';
                            }
                            html += `<div class=\"didroll\" style=\"box-sizing: content-box; text-shadow: rgb(255,255,255) -1px -1px 1px, rgb(255,255,255) 1px -1px 1px, rgb(255,255,255) -1px 1px 1px, rgb(255,255,255) 1px 1px 1px; z-index: 2; position: relative; color: ${color}; height: auto; min-height: 29px; margin-top: -3px; top: 0px; ${fontWeight}\">${didroll.textContent}</div>`;
                        }
                        const backing = dicon.querySelector('.backing');
                        if (backing) {
                            html += `<div class=\"backing\" style=\"box-sizing: content-box; position: absolute; top: -2px; left: 0px; width: 30px; font-size: 30px; color: rgb(143, 177, 217); text-shadow: rgb(143, 177, 217) 0px 0px 3px; opacity: 0.75; pointer-events: none; z-index: 1;\"></div>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                }
            });
            html += `</div>`;
        }
        // If there is a trailing operator (e.g., *5), include it after dicegrouping
        let afterDice = '';
        let next = dicegrouping && dicegrouping.nextSibling;
        while (next) {
            if (next.nodeType === 3 && next.textContent.trim()) {
                afterDice += next.textContent;
            } else if (next.nodeType === 1 && next.outerHTML) {
                afterDice += next.outerHTML;
            }
            next = next.nextSibling;
        }
        if (afterDice) {
            html += afterDice;
        }
        html += `</div>`;
    }
    // --- Clear ---
    html += `<div class=\"clear\" style=\"box-sizing: content-box; clear: both;\"></div>`;
    // --- Result ---
    const strong = message.querySelector('strong, b');
    if (strong) {
        html += `<strong style=\"box-sizing: content-box; font-weight: bold;\">=</strong>`;
    }
    const rolled = message.querySelector('.rolled');
    if (rolled) {
        html += `<div class=\"rolled\" style=\"box-sizing: content-box; display: inline; padding: 4px; background: white; border-radius: 3px; border: 1px solid rgb(209, 209, 209); font-size: 1.4em; line-height: 2em; overflow-wrap: break-word; cursor: move; font-weight: bold; color: black;\">${rolled.textContent}</div>`;
    }
    // --- Flyout ---
    const flyout = message.querySelector('.flyout');
    if (flyout) {
        html += `<div id=\"${flyout.id}\" class=\"flyout\" style=\"box-sizing: content-box; position: absolute; cursor: pointer; height: 24px; width: 2px; right: 10px; top: 0px;\"></div>`;
    }
    html += `</div>`;
    return html;
}

// Function to process the chat HTML
function processChatHtml(html) {
    console.log('Processing chat HTML');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const messages = doc.querySelectorAll('.message');
    console.log('Found messages:', messages.length);
    
    // Extract and display unique image URLs
    const uniqueAvatars = extractUniqueImageUrls(html);
    console.log('Extracted unique avatars:', uniqueAvatars);
    createImageReplacementInterface(uniqueAvatars);
    
    let processedHtml = '';
    let lastAuthor = null;
    let lastMessageType = null;
    
    messages.forEach((message, index) => {
        // Custom: rollresult message - must be FIRST and return immediately
        if (message.classList.contains('rollresult')) {
            processedHtml += convertRollResultMessage(message);
            lastAuthor = null;
            lastMessageType = null;
            return; // skip all further processing for this message
        }
        
        const messageType = message.classList.contains('desc') ? 'desc' : 
                          message.classList.contains('general') ? 'general' : 'desc';
        
        // Get current author
        const currentAuthor = message.querySelector('.by')?.textContent;
        
        // Determine if we need a spacer
        const needsSpacer = messageType === 'desc' || 
                          (lastAuthor && currentAuthor && lastAuthor !== currentAuthor) ||
                          (lastMessageType === 'desc' && messageType !== 'desc');
        
        // Base message style
        let messageStyle = 'box-sizing: content-box; padding-left: 15px; padding-right: 16px; padding-bottom: 7px; background-color: #f1f1f1; position: relative;';
        
        if (messageType === 'desc') {
            messageStyle += ' font-style: italic; font-weight: bold; text-align: center;';
        } else if (messageType === 'general') {
            messageStyle = 'box-sizing: content-box; padding-left: 45px; padding-right: 16px; padding-bottom: 7px; background-color: #f1f1f1; position: relative;';
        }
        
        // Preserve all original classes
        const originalClasses = Array.from(message.classList).join(' ');
        let messageHtml = `<div class="message ${originalClasses}" style="${messageStyle}" data-messageid="${message.dataset.messageid}" data-playerid="${message.dataset.playerid || ''}">`;
        
        // Add spacer only when needed
        if (needsSpacer) {
            const spacerMargin = messageType === 'desc' ? '-15px' : '-45px';
            messageHtml += `<div class="spacer" style="box-sizing: content-box; background-color: #e1e1e1; height: 2px; margin-bottom: 7px; margin-left: ${spacerMargin}; margin-right: -16px;">&nbsp;</div>`;
        }
        
        // Process avatar for general messages
        if (messageType === 'general') {
            const avatar = message.querySelector('.avatar img');
            if (avatar) {
                messageHtml += `<div class="avatar" style="position: absolute; top: 0.3rem; left: 5px; width: 28px; height: 28px; display: flex; align-items: stretch;" aria-hidden="true">
                    <img style="padding: 0px; width: 28px; height: 28px; object-fit: cover; border-radius: 0%;" src="${convertImageUrl(avatar.src)}" />
                </div>`;
            }
            
            const by = message.querySelector('.by');
            if (by) {
                messageHtml += `<span style="font-weight: bold; position: relative; display: inline-block; left: -5px; vertical-align: top;" class="by">${by.textContent}</span>`;
            }
        }
        
        // Process content
        const content = message.innerHTML;
        let processedContent = content
            // Remove timestamp
            .replace(/<span class="tstamp"[^>]*>.*?<\/span>/g, '')
            // Remove the original avatar and by elements since we already processed them
            .replace(/<div class="avatar"[^>]*>.*?<\/div>/g, '')
            .replace(/<span class="by"[^>]*>.*?<\/span>/g, '')
            // Remove the spacer div
            .replace(/<div class="spacer"[^>]*>.*?<\/div>/g, '')
            // Remove the flyout div
            .replace(/<div id="menu-[^"]*" class="flyout"[^>]*>.*?<\/div>/g, '')
            // Process images
            .replace(/<img[^>]*src="([^"]*)"[^>]*>/g, (match, src) => {
                return `<img style="box-sizing: content-box; border: 0px; vertical-align: middle; max-width: 100%; height: auto;" draggable="false" src="${convertImageUrl(src)}" />`;
            })
            // Process links
            .replace(/<a[^>]*style="([^"]*)"[^>]*>/g, (match, style) => {
                return `<a style="text-decoration: none; box-sizing: content-box; background-color: transparent; ${style}">`;
            })
            // Process tables
            .replace(/<table[^>]*>/g, '<table style="box-sizing: content-box; border-spacing: 0px; border-collapse: collapse; background: #ffffff; width: 100%; border: 1px solid black; color: black;">')
            .replace(/<caption[^>]*>/g, '<caption style="box-sizing: content-box; padding: 2px; color: white; background: black; font-weight: bold; border: 1px solid black; line-height: 1.6em;">')
            .replace(/<td[^>]*class="sheet-template_label"[^>]*>/g, '<td class="sheet-template_label" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; font-weight: bold;">')
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center;">')
            .replace(/<span[^>]*class="inlinerollresult"[^>]*>/g, '<span style="box-sizing: content-box; background: #bebebe; border: 2px solid black; padding: 0px 3px; font-weight: bold; cursor: help; font-size: 1.1em; display: inline-block; min-width: 1.5em;" class="inlinerollresult showtip tipsy-n-right">')
            // Preserve result row background color
            .replace(/<tr[^>]*style="background: #bebebe"[^>]*>/g, '<tr style="box-sizing: content-box; background: #bebebe;">')
            // Process result cell colors based on the result text
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>실패<\/td>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: crimson;">실패</td>')
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>대실패<\/td>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: red;">대실패</td>')
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>보통 성공<\/td>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: darkgreen;">보통 성공</td>')
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>어려운 성공<\/td>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: green;">어려운 성공</td>')
            .replace(/<td[^>]*class="sheet-template_value"[^>]*>극단적 성공<\/td>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: lightgreen;">극단적 성공</td>')
            // Also handle cases where the color is specified in the style attribute
            .replace(/<td[^>]*style="[^"]*background: crimson[^"]*"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: crimson;">')
            .replace(/<td[^>]*style="[^"]*background: red[^"]*"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: red;">')
            .replace(/<td[^>]*style="[^"]*background: darkgreen[^"]*"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: darkgreen;">')
            .replace(/<td[^>]*style="[^"]*background: green[^"]*"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: green;">')
            .replace(/<td[^>]*style="[^"]*background: lightgreen[^"]*"[^>]*>/g, '<td class="sheet-template_value" style="box-sizing: content-box; padding: 2px; border-bottom: 1px solid black; text-align: center; background: lightgreen;">');
        
        messageHtml += processedContent;
        messageHtml += '</div>';
        processedHtml += messageHtml;
        
        // Update last author and message type for next iteration
        lastAuthor = currentAuthor;
        lastMessageType = messageType;
    });
    
    return processedHtml;
}

document.getElementById("readButton").addEventListener("click", function () {
    let loadingText = document.getElementById("loadingText");
    loadingText.style.display = "inline";

    // Process the chat log immediately
    let editableBox = document.getElementById("editableBox").value;
    const processedHtml = processChatHtml(editableBox);
    document.getElementById("output").innerHTML = processedHtml;
    
    //check if checkbox is checked 
    const sameColorCheck = document.getElementById("sameColorCheckBox");
    if(sameColorCheck && sameColorCheck.checked) {
        const output = document.getElementById("output");
        output.innerHTML = output.innerHTML.replace(
            /background-color:\s*rgb\(211,\s*229,\s*245\);/g,
            "background-color: hsl(0, 0.00%, 94.50%);"
        );
        output.innerHTML = output.innerHTML.replace(
            /background-color:\s*rgb\(177,\s*217,\s*250\);/g,
            "background-color: rgb(225, 225, 225);"
        );
    }

    // Hide loading message after processing is complete
    loadingText.style.display = "none";
});

//복사하기
document.getElementById("copyButton").addEventListener("click", function () {
    // Get the current output HTML
    let outputHtml = document.getElementById("output").innerHTML;
    
    // Create a complete HTML structure with embedded styles
    const completeHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        .message {
            margin-bottom: 0;
            line-height: 1.4;
            box-sizing: content-box;
            padding-left: 15px;
            padding-right: 16px;
            padding-bottom: 7px;
            background-color: #f1f1f1;
            position: relative;
        }
        .message .spacer {
            box-sizing: content-box;
            background-color: #e1e1e1 !important;
            height: 2px !important;
            margin-bottom: 7px !important;
            margin-left: -15px !important;
            margin-right: -16px !important;
            border: none !important;
            padding: 0 !important;
            min-height: 2px !important;
        }
        .spacer {
            box-sizing: content-box;
            background-color: #e1e1e1 !important;
            height: 2px !important;
            margin-bottom: 7px !important;
            margin-left: -15px !important;
            margin-right: -16px !important;
            border: none !important;
            padding: 0 !important;
            min-height: 2px !important;
        }
        .message.desc {
            font-style: italic;
            font-weight: bold;
            text-align: center;
        }
        .message.general {
            padding-left: 45px;
        }
        .message .avatar {
            position: absolute;
            top: 0.2rem;
            left: 5px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: stretch;
        }
        .message .avatar img {
            padding: 0px;
            width: 28px;
            height: 28px;
            object-fit: cover;
            border-radius: 0%;
        }
        .message .by {
            font-weight: bold;
            position: relative;
            display: inline-block;
            left: -5px;
            vertical-align: top;
        }
        .message .flyout {
            position: absolute;
            cursor: pointer;
            height: 24px;
            width: 2px;
            right: 10px;
            top: 0;
        }
        .sheet-rolltemplate-coc-1 table {
            box-sizing: content-box;
            border-spacing: 0px;
            border-collapse: collapse;
            background: #ffffff;
            width: 100%;
            border: 1px solid black;
            color: black;
        }
        .sheet-rolltemplate-coc-1 caption {
            box-sizing: content-box;
            padding: 2px;
            color: white;
            background: black;
            font-weight: bold;
            border: 1px solid black;
            line-height: 1.6em;
        }
        .sheet-rolltemplate-coc-1 td {
            box-sizing: content-box;
            padding: 2px;
            border-bottom: 1px solid black;
        }
        .sheet-rolltemplate-coc-1 .sheet-template_label {
            font-weight: bold;
        }
        .sheet-rolltemplate-coc-1 .sheet-template_value {
            text-align: center;
        }
        .sheet-rolltemplate-coc-1 .inlinerollresult {
            box-sizing: content-box;
            background: #bebebe;
            border: 2px solid black;
            padding: 0px 3px;
            font-weight: bold;
            cursor: help;
            font-size: 1.1em;
            display: inline-block;
            min-width: 1.5em;
        }
        img {
            box-sizing: content-box;
            border: 0px;
            vertical-align: middle;
            max-width: 100%;
            height: auto;
        }
        a {
            text-decoration: none;
            box-sizing: content-box;
            background-color: transparent;
        }
    </style>
</head>
<body>
    ${outputHtml}
</body>
</html>`;

    let tempTextarea = document.createElement("textarea");
    tempTextarea.value = completeHtml;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    navigator.clipboard.writeText(tempTextarea.value);
    document.body.removeChild(tempTextarea);

    // Show "Copied!" message
    let copyMessage = document.getElementById("copyMessage");
    copyMessage.style.display = "inline";

    // Hide message after 2 seconds
    setTimeout(() => {
        copyMessage.style.display = "none";
    }, 2000);
});