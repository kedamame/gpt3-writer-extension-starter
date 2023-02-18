// Function to get + decode API key
const getKey = () => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["openai-key"], (result) => {
			if (result["openai-key"]) {
				const decodedKey = atob(result["openai-key"]);
				resolve(decodedKey);
			}
		});
	});
};

const sendMessage = (content) => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const activeTab = tabs[0].id;

		chrome.tabs.sendMessage(
			activeTab,
			{ message: "inject", content },
			{},
			(response) => {
				if (response.status === "failed") {
					console.log("injection failed.");
				}
			}
		);
	});
};


// Setup our generate function
const generate = async (prompt) => {
	// Get your API key from storage
	const key = await getKey();
	const url = "https://api.openai.com/v1/completions";

	// Call completions endpoint
	const completionResponse = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({
			model: "text-davinci-003",
			prompt: prompt,
			max_tokens: 1250,
			temperature: 0.7,
		}),
	});

	// Select the top choice and send back
	const completion = await completionResponse.json();
	return completion.choices.pop();
};

// New function here
const generateCompletionAction = async (info) => {
	try {
		// Send mesage with generating text (this will be like a loading indicator)
		sendMessage("generating...");

		const { selectionText } = info;
		const basePromptPrefix = `
		Below is a list of the characteristics of the person you would like to have created, so please generate each of them randomly in the same form as the template.
		Please make enough for three people.


		template↓---------------------------------------------
		Name:
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		template↑---------------------------------------------
      `;

		// Add this to call GPT-3
		const baseCompletion = await generate(
			`${basePromptPrefix}${selectionText}`
		);

		// Add your second prompt here
		// const secondPrompt = `
        // Take the table of contents and title of the blog post below and generate a blog post written in thwe style of Paul Graham. Make it feel like a story. Don't just list the points. Go deep into each one. Explain why.
        
        // Title: ${selectionText}
        
        // Table of Contents: ${baseCompletion.text}
        
        // Blog Post:
        // `;
		const secondPrompt = `
		I would like you to add a home for each of the following people.
		They may not have a home or only children.
		If they do have families, please put the related people near each other and add their family patterns.
		Separate each household with a line.
		Please add a persona to the partner and children in the same way as in the text.
		Even if you do not have a partner or children, please output the person.
		feature in the ${selectionText}.
		If you have more than one child, generate for more than one person.


		template↓---------------------------------------------
		NAME house:
		Name:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>

		<If you have a partner>
		Partner:
		Name:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		<If you have a partner>

		<If you have children.If more than one child, repeat that number.>
		child:
		Name:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		feature:<content>
		<If you have children.If more than one child, repeat that number.>
		template↑---------------------------------------------

		${baseCompletion.text}
        `;

		// Call your second prompt
		const secondPromptCompletion = await generate(secondPrompt);

		// Send the output when we're all done
		sendMessage(secondPromptCompletion.text);
	} catch (error) {
		console.log(error);

		// Add this here as well to see if we run into any errors!
		sendMessage(error.toString());
	}
};

// Add this in scripts/contextMenuServiceWorker.js
chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "context-run",
		title: "Generate blog post",
		contexts: ["selection"],
	});
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);