import { Project, SyntaxKind } from "ts-morph";
import fs from "fs";
import path from "path";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const componentsDir = "components/admin";
const files = project.getSourceFiles();

// Mapping of component name -> data
const wrappers = new Map();

for (const file of files) {
  const filePath = file.getFilePath();
  if (!filePath.includes("/components/") || filePath.includes("ConfirmationModal")) continue;

  const functionDecl = file.getFunctionDeclarations().find(f => f.isExported() && /Button$/.test(f.getName()));
  if (functionDecl) {
    const name = functionDecl.getName();
    // find ConfirmationModal or DeleteActionButton
    const modal = file.getDescendantsOfKind(SyntaxKind.JsxElement).find(n => n.getOpeningElement().getTagNameNode().getText() === "ConfirmationModal")
               || file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).find(n => n.getTagNameNode().getText() === "ConfirmationModal")
               || file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).find(n => n.getTagNameNode().getText() === "DeleteActionButton");

    if (modal) {
       wrappers.set(name, {
         sourceFile: file,
         text: modal.getText(),
         props: functionDecl.getParameters().map(p => p.getName()),
         imports: file.getImportDeclarations().map(i => i.getText())
       });
       console.log("Found wrapper:", name);
    }
  }
}
// For now, let's just log what we found to ensure it works
console.log(`Found ${wrappers.size} wrappers.`);
