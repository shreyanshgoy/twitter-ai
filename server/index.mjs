import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// import pkg from './mcp.tool.mjs';
// const { createPost } = pkg;
import { createPost } from './mcp.tool.mjs';
import {z} from "zod";              // we use zod because it will give us type 

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});



// ... set up server resources, tools, and prompts ...

const app = express();

server.tool(
  "addTwoNumbers",
  "Add two numbers",
  {
      a: z.number(),
      b: z.number()
  },
  async (arg) => {
      const { a, b } = arg;
      return {
          content: [
              {
                  type: "text",
                  text: `The sum of ${a} and ${b} is ${a + b}`
              }
          ]
      }
  }
)


server.tool(
  "createPost",
  "Create a post on X formally known as Twitter ", {
  status: z.string()
}, async (arg) => {
  const { status } = arg;
  return createPost(status);
})

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports = {};

// server client ko data bejta hai
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

// client server ko data bejta hai
app.post("/messages", async (req,res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

app.listen(3001,()=>{
    console.log("server is running on http local 3001");
});


// // SSEServerTransport iski madad se behind the scene hamara ai server se saath communicate kar pata hai


// import express from "express";
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// const app = express();
// app.use(express.json());

// const server = new McpServer({
//   name: "example-server",
//   version: "1.0.0"
// });



// const transports = {};

// // Server to client
// app.get("/sse", async (req, res) => {
//   const transport = new SSEServerTransport(res); // fixed argument
//   transports[transport.sessionId] = transport;

//   res.on("close", () => {
//     delete transports[transport.sessionId];
//   });

//   await server.connect(transport);
// });

// // Client to server
// app.post("/messages", async (req, res) => {
//   const sessionId = req.query.sessionId;
//   const transport = transports[sessionId];
//   if (transport) {
//     await transport.handlePostMessage(req, res);
//   } else {
//     res.status(400).send("No transport found for sessionId");
//   }
// });

// app.listen(3001, () => {
//   console.log("Server is running on http://localhost:3001");
// });


