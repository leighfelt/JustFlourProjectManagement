# JustFlour Project Management

A web-based project management system for JustFlour bakery, including user management and staff scheduling capabilities.

## Features

### System Users Management
- View all authenticated users who can login to the dashboard
- User statistics dashboard (Total Users, Active Users, Administrators)
- Search functionality to find users by name or email
- View-only access for non-administrators
- Admin-only user editing and deletion

### User Roles
- **Admin**: Full access to manage users (create, update, delete)
- **User**: View-only access to the user list

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

```bash
# Install dependencies
npm run install:all

# Start the server
npm start
```

The application will be available at `http://localhost:3001`

### Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/signup` | Register a new user |
| POST | `/api/users/login` | Authenticate a user |
| GET | `/api/users` | Get all users (supports `?search=` query) |
| GET | `/api/users/stats` | Get user statistics |
| GET | `/api/users/:id` | Get a specific user |
| PUT | `/api/users/:id` | Update a user (admin only) |
| DELETE | `/api/users/:id` | Delete a user (admin only) |

## Project Structure

```
├── server/                 # Backend server
│   ├── src/
│   │   ├── index.js       # Express server setup
│   │   ├── models/        # Data models
│   │   │   └── user.js    # User model
│   │   └── routes/        # API routes
│   │       └── users.js   # User routes
│   └── tests/             # Test files
├── client/                 # Frontend client
│   └── public/
│       └── index.html     # Dashboard UI
├── package.json           # Root package.json
└── README.md
```

## License

MIT
