import os

file_path = 'components/admin/BookForm.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_content = """      {/* Price & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-price" className={labelClassName}>
            Selling Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-price"
            name="priceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.priceInr}
            onChange={(e) => updateField("priceInr", e.target.value)}
            onBlur={() => markTouched("priceInr")}
            aria-invalid={showError("priceInr") || undefined}
            placeholder="e.g. 299"
            className={formFieldInputClass(showError("priceInr"))}
          />
          {showError("priceInr") && <p className={formErrorTextClassName} role="alert">{errors.priceInr}</p>}
        </div>

        <div>
          <label htmlFor="book-purchase-price" className={labelClassName}>
            Purchase Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-purchase-price"
            name="purchasePriceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.purchasePriceInr}
            onChange={(e) => updateField("purchasePriceInr", e.target.value)}
            onBlur={() => markTouched("purchasePriceInr")}
            aria-invalid={showError("purchasePriceInr") || undefined}
            placeholder="e.g. 150"
            className={formFieldInputClass(showError("purchasePriceInr"))}
          />
          {showError("purchasePriceInr") && <p className={formErrorTextClassName} role="alert">{errors.purchasePriceInr}</p>}
        </div>"""

new_content = """      {/* Price & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-mrp" className={labelClassName}>
            MRP (₹) <span className="font-normal text-muted">(Optional)</span>
          </label>
          <input
            id="book-mrp"
            name="mrpInr"
            type="number"
            min="0"
            step="0.01"
            value={values.mrpInr || ""}
            onChange={(e) => updateField("mrpInr", e.target.value)}
            onBlur={() => markTouched("mrpInr")}
            aria-invalid={showError("mrpInr") || undefined}
            placeholder="e.g. 500"
            className={formFieldInputClass(showError("mrpInr"))}
          />
          {showError("mrpInr") && <p className={formErrorTextClassName} role="alert">{errors.mrpInr}</p>}
        </div>

        <div>
          <label htmlFor="book-price" className={labelClassName}>
            Selling Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-price"
            name="priceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.priceInr}
            onChange={(e) => updateField("priceInr", e.target.value)}
            onBlur={() => markTouched("priceInr")}
            aria-invalid={showError("priceInr") || undefined}
            placeholder="e.g. 299"
            className={formFieldInputClass(showError("priceInr"))}
          />
          {showError("priceInr") && <p className={formErrorTextClassName} role="alert">{errors.priceInr}</p>}
        </div>

        <div>
          <label htmlFor="book-purchase-price" className={labelClassName}>
            Purchase Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-purchase-price"
            name="purchasePriceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.purchasePriceInr}
            onChange={(e) => updateField("purchasePriceInr", e.target.value)}
            onBlur={() => markTouched("purchasePriceInr")}
            aria-invalid={showError("purchasePriceInr") || undefined}
            placeholder="e.g. 150"
            className={formFieldInputClass(showError("purchasePriceInr"))}
          />
          {showError("purchasePriceInr") && <p className={formErrorTextClassName} role="alert">{errors.purchasePriceInr}</p>}
        </div>"""

content = content.replace(old_content, new_content)

# We should also update the grid columns to fit 3 items beautifully instead of 2. Wait, it's `grid gap-4 sm:grid-cols-2`. If I have MRP, Selling Price, Purchase Price, Inventory, Status, that's 5 items. 
# `sm:grid-cols-2 lg:grid-cols-3` would be better. Let's do that.
content = content.replace('<div className="grid gap-4 sm:grid-cols-2">', '<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")
