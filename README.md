# SynapseUK Staff Management Platform

A comprehensive staff management platform built with Next.js and the CodeWords API.

## Features

- **Authentication System**: Role-based login (admin/manager/staff) with secure session management
- **Dashboard**: Comprehensive overview with metrics, recent activity, and quick actions
- **Staff Management**: Complete directory with profiles, compliance tracking, and document management
- **Request System**: Leave requests, expense claims, and shift swaps with approval workflows
- **Kanban Board**: Task management with drag-and-drop functionality and filtering
- **Document Hub**: Secure file upload with categorization and expiry tracking
- **Announcements**: Priority-based communication system with read status tracking
- **Safeguarding**: Secure incident reporting and case management system

## Environment Setup

### Development

1. Copy the environment template:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

2. Add your CodeWords API key to `.env.local`:
   \`\`\`env
   CODEWORDS_API_KEY=your_actual_api_key_here
   \`\`\`

### Production (Vercel)

Add the following environment variable in your Vercel project settings:

- **Name**: `CODEWORDS_API_KEY`
- **Value**: Your CodeWords API key
- **Environment**: Production, Preview, Development

## Security

- API keys are server-side only and never exposed to the client
- Authentication uses secure HTTP-only cookies
- All API calls go through server actions for enhanced security
- Role-based access control throughout the application

## Getting Started

1. Set up your environment variables (see above)
2. Deploy to Vercel or run locally
3. Access the platform and log in with your CodeWords credentials

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **API Integration**: CodeWords service client
- **Authentication**: Server actions with HTTP-only cookies
- **Deployment**: Vercel
