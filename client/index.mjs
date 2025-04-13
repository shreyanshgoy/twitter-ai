import readline  from 'readline/promises'   
//Is module ka use terminal (CLI) se input lene ke liye hota hai, jaise chat application me user se text lena.
import { config }  from 'dotenv';
import { GoogleGenAI } from  "@google/genai"
import {Client} from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { text } from 'stream/consumers';
import { type } from 'os';
config()


let tools =[]   //global variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mcpClient = new Client({
    name : "example-client",
    version: "1.0.0",
})




async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "Explain how AI works",
  });
  console.log(response.text);
}

// await main();




//Iska use chat ke andar hua conversation (user input & AI response) ko store karne ke liye hoga.
const chathistory = [];


const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

mcpClient.connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
.then(async ()=>{
    console.log("connected to server");

     tools = (await mcpClient.listTools()).tools.map(tool=>{
        return {
            name : tool.name,
            description: tool.description,
            parameters: {
                type: tool.inputSchema.type,
                properties: tool.inputSchema.properties,
                required: tool.inputSchema.required
            }
        }
    })
    // console.log("available tools", tools)
    chatloop()
})


// ye function user se continously input mangta rahega and ouput  pass karta rahega ai ko
async function chatloop(toolcall){
    if(toolcall){
       console.log("calling tool :" , toolcall.name)
      
       chathistory.push({
        role:"model",
        parts:[
            {
                text: `calling tool ${toolcall.name}`,
                type: "text"
            }
        ]
       })



 const toolResult = await mcpClient.callTool({
        name: toolcall.name,
        arguments: toolcall.args,
    })



    chathistory.push({
        role:"user",
        parts:[
            {
                text: "Tool result :" + toolResult.content[0].text,
                type: "text"
            }
        ]
       })

    // console.log(toolResult)
    
   }else{

       const question = await rl.question('you: ');
           
       chathistory.push({
          role:"user",
          parts:[
              {
                  text:question,
                  type: "text"
              }
          ]
       })
   }




 const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: chathistory,
    config:{
        tools:[
            {
                functionDeclarations: tools,
            }
        ]
    }

 })

//  console.log(response.candidates[0].content.parts[0].text)
const functionCall = response.candidates[0].content.parts[0].functionCall
const responsetext = response.candidates[0].content.parts[0].text;    // save the history so taht the ai will remember all the privious chat

if(functionCall){
    // console.log(`AI : ${functionCall}`)
    return chatloop(functionCall);
}


// console.log(response)
chathistory.push({
    role: "model",
    parts:[
        {
            text:responsetext,
            type: "text"
        }
    ]
})

console.log(`ai : ${responsetext}`);

 chatloop()
}
