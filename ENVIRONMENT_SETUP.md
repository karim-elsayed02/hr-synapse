# Environment Setup

## Development Setup

Create a `.env.local` file in your project root with:

\`\`\`
CODEWORDS_API_KEY=your_api_key_here
\`\`\`

## Production Setup

Add the following environment variable in your Vercel project settings:

- **Name:** `CODEWORDS_API_KEY`
- **Value:** Your CodeWords API key
- **Environment:** All (Production, Preview, Development)

## Security Notes

- Never commit `.env.local` to version control
- The API key is only accessible server-side
- Authentication uses secure HTTP-only cookies
