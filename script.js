// Function to convert image URLs to Roll20 format
function convertImageUrl(url) {
    if (url.startsWith('https://i.imgur.com/')) {
        return `https://imgsrv.roll20.net/?src=${encodeURIComponent(url)}`;
    }
    return url;
}

// Function to extract unique image URLs from HTML
function extractUniqueImageUrls(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const messages = doc.querySelectorAll('.message');
    const uniqueAvatars = new Map(); // Map to store username -> avatar URL
    
    messages.forEach(message => {
        const avatar = message.querySelector('.avatar img');
        const username = message.querySelector('.by')?.textContent;
        if (avatar && avatar.src && username) {
            uniqueAvatars.set(username, avatar.src);
        }
    });
    
    return uniqueAvatars;
}

// Function to create image replacement interface
function createImageReplacementInterface(uniqueAvatars) {
    const container = document.getElementById('imageReplacements');
    const list = document.getElementById('imageReplacementList');
    list.innerHTML = '';
    
    if (uniqueAvatars.size === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    uniqueAvatars.forEach((url, username) => {
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
        originalInput.dataset.originalUrl = url;  // Store the original URL
        
        const replacementInput = document.createElement('input');
        replacementInput.type = 'text';
        replacementInput.placeholder = '새 아이콘 URL';
        replacementInput.style.width = '300px';
        
        div.appendChild(label);
        div.appendChild(originalInput);
        div.appendChild(replacementInput);
        list.appendChild(div);
    });

    // Add event listener for the global icon change button
    document.getElementById('changeAllIcons').addEventListener('click', function() {
        // Get the current output HTML
        const currentOutput = document.getElementById("output").innerHTML;
        
        // Get all input pairs
        const inputs = document.querySelectorAll('#imageReplacementList input[type="text"]');
        let processedHtml = currentOutput;
        
        // Process each pair of inputs
        for (let i = 0; i < inputs.length; i += 2) {
            const readonlyInput = inputs[i];
            const replacementInput = inputs[i + 1];
            
            if (replacementInput && replacementInput.value.trim()) {
                const currentUrl = readonlyInput.value;
                const newUrl = replacementInput.value.trim();
                
                // Replace the current URL with the new URL in the output
                const escapedUrl = currentUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                processedHtml = processedHtml.replace(
                    new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*>`, 'g'),
                    match => match.replace(`src="${currentUrl}"`, `src="${newUrl}"`)
                );
                
                // Update the readonly input with the new URL
                readonlyInput.value = newUrl;
                // Clear the replacement input
                replacementInput.value = '';
            }
        }
        
        // Update the output with the processed HTML
        document.getElementById("output").innerHTML = processedHtml;
    });
}

// Function to process the chat HTML
function processChatHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const messages = doc.querySelectorAll('.message');
    
    // Extract and display unique image URLs
    const uniqueAvatars = extractUniqueImageUrls(html);
    createImageReplacementInterface(uniqueAvatars);
    
    let processedHtml = '';
    let lastAuthor = null;
    let lastMessageType = null;
    
    messages.forEach((message, index) => {
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
        
        let messageHtml = `<div class="message ${messageType}" style="${messageStyle}" data-messageid="${message.dataset.messageid}">`;
        
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
            background-color: #e1e1e1;
            height: 2px;
            margin-bottom: 7px;
            margin-left: -15px;
            margin-right: -12px;
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