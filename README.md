# Data Analyst Agent

A modern web application that provides an AI-powered interface for data analysis. This application allows users to interact with an AI agent to analyze data through various methods including file uploads, database connections, and API integrations.

## Features

- Interactive chat interface with the AI agent
- Multiple data source support:
  - File uploads (CSV, Excel, JSON)
  - Database connections
  - API integrations
- Real-time data visualization
- Modern, responsive UI
- TypeScript support
- Built with Next.js and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-analyst-agent
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   └── page.tsx        # Main page component
├── components/         # React components
│   ├── ChatMessage.tsx # Chat message component
│   ├── DataUpload.tsx  # Data upload component
│   └── Visualization.tsx # Data visualization component
└── styles/            # Global styles
```

## Usage

1. Start a conversation with the AI agent by typing in the chat input
2. Upload data through one of the supported methods:
   - Drag and drop or select files
   - Connect to a database
   - Import from an API
3. Ask the agent to analyze your data
4. View the results in the visualization section

## Development

### Adding New Features

1. Create new components in the `src/components` directory
2. Update the main page in `src/app/page.tsx` to include new features
3. Add any necessary API routes in the `src/app/api` directory

### Styling

The project uses Tailwind CSS for styling. You can modify the styles in the component files or add new styles in the `src/styles` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
