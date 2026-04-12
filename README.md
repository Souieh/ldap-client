# ldap

LDAP Directory Manager - A modern, clean, and easy-to-use LDAP client for managing Samba4 Directory Services. Built with Next.js, shadcn/ui, and Lucide icons.

## Features

- **Multi-Profile Configuration**: Store and manage multiple LDAP connection profiles locally
- **Secure Authentication**: Session-based authentication against your LDAP directory
- **System Dashboard**: Real-time statistics for users, groups, and computer objects
- **AD Management**: Browse and manage:
  - Users with account status, email, and more
  - Computers and workstations
  - Groups and group memberships
  - Organizational Units (OUs) with tree navigation
- **DNS Manager**: Full DNS record management with support for all record types:
  - A, AAAA, CNAME, MX, NS, TXT, SOA, SRV, PTR, CAA
- **Rich Data Display**: Advanced filtering, sorting, and search capabilities
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Zero Configuration Hardcoding**: All UI labels, LDAP attributes, and DNS types are externalized constants

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **Icons**: Lucide React
- **LDAP**: ldapts (pure JavaScript LDAP client)
- **Storage**: Local file-based configuration (server-side)
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Sonner

## Environment Variables

Before running the application, create a `.env` file from `.env.example`:

```env
SESSION_SECRET=your_32_hex_characters_secret
SAMBA_DC_IP=your_dc_ip
HOSTNAME=0.0.0.0
PORT=3000
```

- `SESSION_SECRET`: A secure secret for session encryption (recommended 32 hex characters).
- `SAMBA_DC_IP`: IP address of your Samba Domain Controller (used for DNS resolution in Docker).
- `HOSTNAME`: Bind address for the server.
- `PORT`: Port to run the application on.

## Getting Started

### Direct Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ldap
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your details.

4. **Run for development**:
   ```bash
   pnpm dev
   ```

5. **Build for production**:
   ```bash
   pnpm build
   pnpm start
   ```

### Docker Setup

The easiest way to run the application is using Docker Compose:

1. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your details.

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```

The application will be available at `http://localhost:3000`.

## Initial Configuration

1. **Create LDAP Profile**: Go to Settings and create your first LDAP connection profile.
   - Hostname: Your DC hostname or IP
   - Port: 389 (LDAP) or 636 (LDAPS)
   - Bind DN: Admin account DN (e.g., `cn=Administrator,cn=Users,dc=example,dc=com`)
   - Domain: Your domain name
   - Base DN: Your base DN (e.g., `dc=example,dc=com`)

2. **Test Connection**: Use the test button to verify your connection works.

3. **Start Managing**: Navigate to AD Management or DNS Manager to begin.

## Security Considerations

⚠️ **Important Security Notes**:

1. **Password Handling**: LDAP passwords are only kept in client memory during session and never persisted to disk.
2. **Configuration Files**: Profiles are stored in `./config/profiles.json` but do not contain passwords.
3. **Recommendations**:
   - Use LDAPS (636) for encrypted connections.
   - Run behind authentication/firewall in production.

## Future Enhancements

- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] User creation/modification forms
- [ ] Group membership management
- [ ] Bulk operations
- [ ] Activity logging

## License

MIT
