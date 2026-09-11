# Kaivan Stone — Progressive Web Development 

**Tagline:** Earth to Excellence 🪨

A professional stone trading company website built progressively to teach modern web development concepts through hands-on implementation.

---

## 📚 Learning Roadmap

### Completed ✅
- **Step 1: HTML Structure** — Semantic markup, forms, data attributes
- **Step 2: CSS Design System** — Variables, typography, responsive grid, media queries
- **Step 3: Navigation & Scrolling** — Mobile hamburger menu, smooth scroll anchors
- **Step 4: Arrays & Objects** — Array iteration with forEach(), dynamic HTML generation
- **Step 5: Functions** — Modularizing code, reusable logic, return values
- **Step 6: DOM Manipulation** — Creating/removing elements, innerHTML, appendChild
- **Step 7: Stone Interaction** — Button events, data attributes, dynamic display
- **Step 8: Advanced Forms** — Validation patterns, error messaging, submission handling
- **Step 9: Data & Logic** — Separating data from presentation, stone descriptions
- **Step 10: Fetch & APIs** — Loading data from server/external sources
- **Step 11: JSON** — Data format understanding, parsing/stringifying
- **Step 12: Async JS** — Promises, async/await, handling timing
- **Step 13: Backend Preparation** — Server endpoints, database readiness

---

## 📂 Project Structure

```
kaivan/
├── index.html          # Main page structure (semantic HTML5)
├── style.css           # Responsive design system with variables
├── script.js           # JavaScript interactivity & dynamic content
├── images/             # Stone and hero images
│   ├── hero.jpg
│   ├── steel-grey.jpg
│   ├── black-pearl.jpg
│   └── ... (10 stone images total)
└── README.md           # This file
```

---

## 🎯 Key Concepts

### HTML5 Semantic Markup
- `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Form elements: `<input>`, `<textarea>`, `<label>`, `<button>`
- Data attributes: `data-stone="steel-grey"` for JavaScript targeting

### CSS3 Design System
- CSS Custom Properties (variables): `--cream`, `--stone`, `--dark`
- Responsive Typography: `clamp(min, preferred, max)`
- Responsive Grid: `grid-template-columns: repeat(3, 1fr)` → `1fr` on mobile
- Smooth Transitions: transform, opacity, background-color
- Media Queries: `@media (max-width: 768px)`

### JavaScript ES6+
- **Array Methods**: `forEach()`, `map()`, `filter()`, `find()`
- **DOM Selection**: `getElementById()`, `querySelector()`, `querySelectorAll()`
- **Event Handling**: `addEventListener()`, `event.preventDefault()`
- **Template Literals**: `` `<h3>${stone.name}</h3>` ``
- **Object Properties**: `stone.name`, `stone.image`, `stone.id`
- **Dynamic HTML**: `createElement()`, `innerHTML`, `appendChild()`- **Modular Functions**: Helper functions for reusability, validation, display
- **Promises & Async/Await**: `async function`, `await`, `.then()`, `.catch()`
- **JSON**: `JSON.stringify()`, `JSON.parse()`
- **Local Storage**: `localStorage.setItem()`, `localStorage.getItem()`
---

## 🚀 Getting Started



---

## 🛠️ Current Features

✅ **Navigation**
- Hamburger menu for mobile
- Smooth scroll to page sections
- Auto-close menu after clicking link

✅ **Stone Collection**
- **10 premium stones** dynamically generated from JavaScript array
- Click "View Stone" to display stone descriptions
- Responsive 3-column grid (1 column on mobile)
- Hover animations (lift effect, image zoom)

✅ **Contact Form**
- 5-step validation: name, email format, message, company, phone
- Clear error messages (red) and success confirmation (green)
- Form resets after successful submission

✅ **Responsive Design**
- Works on desktop (1920px+), tablet (768px-1024px), mobile (<768px)
- Flexible typography scaling
- Touch-friendly buttons and spacing

---

## 📝 Code Examples

### Array of Objects + Dynamic HTML
```javascript
const stoneCollection = [
    { name: "Steel Grey", image: "images/steel-grey.jpg", id: "steel-grey" },
    { name: "Black Pearl", image: "images/black-pearl.jpg", id: "black-pearl" },
    // ... more stones
];

stoneCollection.forEach(function (stone) {
    const article = document.createElement("article");
    article.className = "stone-card";
    article.innerHTML = `
        <img src="${stone.image}" alt="${stone.name} granite">
        <h3>${stone.name}</h3>
        <button class="stone-button" data-stone="${stone.id}">View Stone</button>
    `;
    collectionGrid.appendChild(article);
});
```

### Event Listener + Data Attribute Access
```javascript
const stoneButtons = document.querySelectorAll(".stone-button");
stoneButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const stoneId = button.dataset.stone;  // Get data-stone value
        const stone = stones[stoneId];         // Lookup in object
        stoneInfo.innerHTML = `<h3>${stone.name}</h3><p>${stone.description}</p>`;
    });
});
```

### Form Validation
```javascript
quoteForm.addEventListener("submit", function (event) {
    event.preventDefault();
    
    let error = "";
    if (!name.value.trim()) error = "Name is required";
    else if (!email.value.includes("@")) error = "Valid email required";
    else if (!message.value.trim()) error = "Message is required";
    
    if (error) {
        formMessage.style.color = "#d32f2f";
        formMessage.textContent = error;
    } else {
        formMessage.style.color = "#4caf50";
        formMessage.textContent = "Quote requested! We'll contact you soon.";
        quoteForm.reset();
    }
});
```

---

---

## 🎮 Interactive Console Commands



## 🔧 Troubleshooting

**Images not loading?**
- Ensure `images/` folder exists in the kaivan directory
- Add actual image files matching the filenames in stoneCollection

**Console errors with `stones` object?**
- The `stones` object (with descriptions, pricing, ratings) is in the main data
- `stoneCollection` array provides the image mapping
- Both work together in `generateStoneCollection()`

**Mobile menu not closing?**
- Check that `nav-links.open` class is properly toggled
- Verify CSS media query at 768px breakpoint is applied

**Form validation not working?**
- Open Console to see validation details
- Check that form fields have correct IDs: `name`, `email`, `phone`, `company`, `message`
- Phone must be at least 10 digits (validates using regex)
- Message must be at least 10 characters

**Async commands not working?**
- Make sure you're using `await` in the console
- These mock API calls simulate 2-second delays (use async/await or .then())
- Check browser Console for detailed logs

---

## 📚 Next Steps

1. **Implement Step 5 (Functions)** — Refactor repetitive code into reusable functions
2. **Enhance Stone Data** — Add more properties (origin, dimensions, price)
3. **Add Loading State** — Show spinners while "fetching" data
4. **Create Admin Panel** — Later: add/edit/delete stones
5. **Connect Backend** — POST form data to server

---

## 💡 Key Takeaway

**This project demonstrates that modern websites are built in layers:**
1. **HTML** = Structure (what goes on the page)
2. **CSS** = Presentation (how it looks)
3. **JavaScript** = Behavior (how it works)

**Data flows:** Array → Loop → HTML → Display → User → Events → Functions → Update


---

