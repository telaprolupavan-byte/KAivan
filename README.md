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
├── public/                 # Everything served to the browser (and nothing else)
│   ├── index.html          # Public website
│   ├── style.css
│   ├── script.js           # Stone collection + quote request form
│   ├── admin-login.html    # Admin login page
│   ├── admin-login.js
│   ├── admin.html          # Admin dashboard (served only to logged-in admins)
│   ├── admin.css
│   ├── admin.js            # Stone CRUD + quote management
│   ├── 404.html
│   ├── robots.txt
│   └── images/
├── server/
│   ├── server.js           # Entry point: config, MongoDB, sessions, graceful shutdown
│   ├── app.js              # Express app: routes, security middleware, error handling
│   ├── config.js           # Environment variable loading + validation
│   ├── validation.js       # Request validation for stones and quotes
│   ├── DB.js               # MongoDB connection + indexes
│   ├── migrate-stones.js   # Seeds the stones collection
│   └── data/stones.js      # Seed data
├── scripts/hash-password.js
├── test/                   # API tests (node:test + supertest)
├── .env.example            # Template for required environment variables
└── README.md
```

---

## 🚀 Getting Started

Requirements: Node.js 20+ and a MongoDB database (e.g. MongoDB Atlas).

```bash
npm install
cp .env.example .env                       # then fill in the values
npm run hash-password -- "<admin password>" # paste output into ADMIN_PASSWORD_HASH
npm run seed                               # insert the starter stone catalog
npm start                                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm start` | Start the server |
| `npm run dev` | Start with auto-reload |
| `npm test` | Run the API test suite |
| `npm run seed` | Insert missing seed stones (existing stones are left untouched) |
| `npm run seed -- --reset` | Delete **all** stones and re-seed |
| `npm run hash-password -- "<pw>"` | Generate a bcrypt hash for `ADMIN_PASSWORD_HASH` |

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `MONGODB_DB` | | Database name (default `kaivan`) |
| `ADMIN_USERNAME` | ✅ | Admin login username |
| `ADMIN_PASSWORD_HASH` | ✅ | bcrypt hash of the admin password |
| `SESSION_SECRET` | ✅ | Random string, 32+ characters in production |
| `NODE_ENV` | | Set to `production` in production (secure cookies, HSTS, caching) |
| `PORT` | | HTTP port (default `3000`) |
| `TRUST_PROXY` | | Number of reverse proxies in front of the app (set `1` on Render/Heroku/Nginx) |

The server refuses to start if a required variable is missing or invalid.

### Production checklist

- `NODE_ENV=production`, served over HTTPS, `TRUST_PROXY` set to match your hosting.
- Never commit `.env` — it is git-ignored; configure secrets in your host's dashboard.
- Health check endpoint for your load balancer: `GET /api/health` (checks the database).
- Admin sessions are stored in MongoDB (`sessions` collection) and expire after 8 hours.

### Security features

- Helmet security headers with a strict Content Security Policy
- Rate limiting: API (300 / 15 min), admin login (10 failed / 15 min), quote requests (10 / hour) per IP
- Server-side validation of all input (types, lengths, formats) — blocks NoSQL operator injection
- bcrypt password check, session regeneration on login, `HttpOnly` / `SameSite` / `Secure` cookies
- Only `public/` is served; server source, `package.json` and `.env` are never exposed
- Frontend renders user and database content with `textContent` (no HTML injection)

### API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | | Service + database health |
| GET | `/api/stones` | | All stones, keyed by id |
| GET | `/api/stones/:id` | | One stone |
| POST | `/api/stones` | admin | Create stone |
| PUT | `/api/stones/:id` | admin | Update stone |
| DELETE | `/api/stones/:id` | admin | Delete stone |
| POST | `/api/quotes` | | Submit quote request |
| GET | `/api/quotes` | admin | List quotes (newest first) |
| GET | `/api/quotes/:id` | admin | One quote |
| PATCH | `/api/quotes/:id/status` | admin | Set status: `new`, `in-progress`, `quoted`, `completed`, `cancelled` |
| POST | `/api/admin/login` | | Log in |
| GET | `/api/admin/me` | | Session status |
| POST | `/api/admin/logout` | | Log out |

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

## 🔧 Troubleshooting

**Images not loading?**
- Images live in `public/images/`; a stone without an `image` value uses `images/<stone-id>.jpg`

**Mobile menu not closing?**
- Check that `nav-links.open` class is properly toggled
- Verify CSS media query at 768px breakpoint is applied

**Form validation not working?**
- Check that form fields have correct IDs: `name`, `email`, `phone`, `company`, `stone`, `quantity`, `message`
- Phone must be at least 10 digits (validates using regex)
- Message must be at least 10 characters

---

## 📚 Next Steps

1. **Email notifications** — Notify the sales team when a new quote arrives
2. **Image uploads** — Upload stone photos from the admin dashboard
3. **Pagination** — Page the admin quote list as volume grows

---

## 💡 Key Takeaway

**This project demonstrates that modern websites are built in layers:**
1. **HTML** = Structure (what goes on the page)
2. **CSS** = Presentation (how it looks)
3. **JavaScript** = Behavior (how it works)

**Data flows:** Array → Loop → HTML → Display → User → Events → Functions → Update


---

