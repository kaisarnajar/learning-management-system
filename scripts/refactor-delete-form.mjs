import { Project, SyntaxKind } from "ts-morph";
import fs from "fs";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Refactor DeleteForm -> ConfirmationModal in [id]/page.tsx files
const deleteFormFiles = project.getSourceFiles().filter(f => f.getFilePath().includes("/[id]/page.tsx") || f.getFilePath().includes("/[id]/edit/page.tsx") || f.getFilePath().includes("/[id]/reply/page.tsx") || f.getFilePath().includes("/[bookId]/page.tsx"));

for (const file of deleteFormFiles) {
  let changed = false;
  
  const imports = file.getImportDeclarations();
  const deleteFormImport = imports.find(i => i.getModuleSpecifierValue() === "@/components/admin/DeleteForm");
  
  if (deleteFormImport) {
    deleteFormImport.setModuleSpecifier("@/components/shared/DeleteActionButton");
    const namedImports = deleteFormImport.getNamedImports();
    if (namedImports.length > 0) {
      namedImports[0].setName("DeleteActionButton");
    }
    
    // Find all JSX elements using DeleteForm
    const jsxElements = file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .filter(n => n.getTagNameNode().getText() === "DeleteForm");
      
    for (const jsx of jsxElements) {
      jsx.getTagNameNode().replaceWithText("DeleteActionButton");
      
      const labelAttr = jsx.getAttribute("label");
      let itemName = "item";
      if (labelAttr && labelAttr.getKind() === SyntaxKind.JsxAttribute) {
        const val = labelAttr.getInitializer()?.getText()?.replace(/"/g, "") || "item";
        itemName = val.replace("Delete ", "").trim();
        labelAttr.replaceWithText(`itemName="${itemName}"`);
      } else {
        jsx.addAttribute({ name: "itemName", initializer: '"item"' });
      }
    }
    
    // Also handle regular JsxElement if it exists (though DeleteForm is self-closing mostly)
    const jsxBlockElements = file.getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter(n => n.getOpeningElement().getTagNameNode().getText() === "DeleteForm");
    
    for (const jsx of jsxBlockElements) {
      jsx.getOpeningElement().getTagNameNode().replaceWithText("DeleteActionButton");
      jsx.getClosingElement().getTagNameNode().replaceWithText("DeleteActionButton");
    }

    changed = true;
  }
  
  if (changed) {
    file.saveSync();
    console.log("Refactored DeleteForm in", file.getFilePath());
  }
}
