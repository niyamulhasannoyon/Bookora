# Bookora — Commercial Multi-Tenant SaaS Platform Manual

> **Complete Guide to Platform Control, Subscription Monetization, and White-Label Deployment**

Welcome to **Bookora**. This system is engineered from the ground up as a production-grade, multi-tenant appointment scheduling SaaS platform (similar to Calendly + Fresha + Acuity).

---

## 1. Platform Master Control (Super Admin Panel)

As the platform owner, you have complete global visibility and control over all businesses, users, bookings, and revenue.

### How to Access the Super Admin Panel
* **URL**: Navigate to `/super-admin` (e.g., `https://yourdomain.com/super-admin` or `http://localhost:3000/super-admin`).
* **Navigation Link**: When signed in with a Super Admin account, a **"Super Admin Panel"** link automatically appears inside your profile dropdown in the top navbar.

### How to Designate Super Admins
There are two secure ways to grant Super Admin access:

#### Method A: Via Environment Variables (Recommended for Owners)
In your `.env` or `.env.local` (and in Vercel Environment Variables):
```env
SUPER_ADMIN_EMAILS="your-email@gmail.com,admin@bookora.com"
```
Any user who signs in with an email in this list is automatically granted Super Admin master privileges.

#### Method B: Via Database
Set `isSuperAdmin = true` on the `User` record in PostgreSQL using Prisma Studio:
```bash
npx prisma studio
```
Navigate to `User` -> find your user -> set `isSuperAdmin` to `true` -> Save.

---

### Super Admin Capabilities

| Feature | Description | Action Location |
| :--- | :--- | :--- |
| **Platform Master Dashboard** | View live total businesses, total users, global bookings, and total platform GMV (processed booking payments). View diagnostic health of Database, Stripe, Resend, and Google OAuth. | `/super-admin` |
| **Organization Management** | Search all tenant organizations, view their member count, active services, and booking counts. Direct link to inspect their public storefront. | `/super-admin/organizations` |
| **Manual Plan Overrides** | Change any organization's plan tier on the fly (`FREE`, `PRO`, `ENTERPRISE`). Perfect for closing enterprise deals or manual invoice billing! | `/super-admin/organizations` |
| **Tenant Suspension** | Instantly suspend abusive or overdue accounts. Suspended tenants cannot create services, take bookings, or invite members. | `/super-admin/organizations` |
| **User Directory** | Search all registered platform users, view their verified status, linked organizations, and promote/demote Super Admin privileges. | `/super-admin/users` |
| **Global Bookings Feed** | Real-time audit trail of all appointments booked across all businesses on the platform, including customer contact details and Stripe payment status. | `/super-admin/bookings` |

---

## 2. Subscription Plans & Feature Gating

Bookora includes a 3-tier SaaS pricing model with built-in quota limit enforcement.

### Plan Tiers & Quotas

| Tier | Price | Active Services | Team Members | Monthly Bookings | Google Calendar 2-Way Sync | Automated Reminders |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Starter** | $0 / month | Up to **3** | Up to **1** (Solo owner) | **50** / mo | No | Confirmation only |
| **Professional** | **$29** / month<br>($290 / year) | Up to **15** | Up to **5** staff | **1,000** / mo | **Yes** | **Yes** (24h & 1h) |
| **Enterprise** | **$79** / month<br>($790 / year) | **Unlimited** | **Unlimited** | **Unlimited** | **Yes** | **Yes** (Priority) |

### Automated Quota Enforcement
* **Creating Services** (`src/actions/service.ts`): If a user on the Free plan attempts to create a 4th active service, the platform blocks the request and prompts them to upgrade to Pro.
* **Inviting Team Members** (`src/actions/team.ts`): If a user on the Free plan attempts to invite extra staff, the system checks plan capacity and prompts them to upgrade.
* **Monthly Bookings Limit**: Computed against bookings made in the current calendar month.

### Stripe SaaS Billing Integration
* **Checkout Route**: `/api/billing/checkout` — Creates a Stripe Checkout Session in `subscription` mode.
* **Customer Portal**: `/api/billing/portal` — Allows paying customers to update their credit cards, view past invoices, or cancel their subscription directly on Stripe.
* **Webhook Lifecycle** (`/api/webhooks/stripe`):
  - `checkout.session.completed` (subscription mode): Automatically upgrades the organization's plan to `PRO` or `ENTERPRISE` and saves `stripeCustomerId` & `stripeSubscriptionId`.
  - `customer.subscription.updated`: Syncs renewal dates and flags `PAST_DUE` if payment fails.
  - `customer.subscription.deleted`: Gracefully resets the organization back to the `FREE` plan.

---

## 3. How to Monetize & Sell Bookora

You can commercialize this codebase using 3 distinct business models:

### Model 1: Operate as a Public B2B SaaS (Recurring Revenue)
Host the app on your custom domain (e.g. `www.yourbrand.com`). Businesses sign up, select a plan, and pay you monthly via Stripe.

* **Target Market**:
  1. Hair salons, barbershops, nail spas
  2. Dentists, physiotherapists, chiropractors
  3. Private tutors, music teachers, sports coaches
  4. Consultants, accountants, lawyers
* **Revenue Math**:
  - 25 Pro clients = **$725 / month**
  - 100 Pro clients = **$2,900 / month** ($34,800 / year recurring)
  - 20 Enterprise clients = **$1,580 / month** ($18,960 / year recurring)
* **How to Market**:
  - Run local Google or Meta ads targeting *"Salon booking software"* or *"Appointment app for doctors"*.
  - Direct outreach to local service businesses with a 14-day free trial.

---

### Model 2: Turnkey White-Label Setup Agency (Fast High Cash Flow)
Instead of just asking clients to self-serve, you offer a "Done-For-You" appointment booking setup.

* **Package Offering**:
  - *"We set up your online booking system, add all your services, import staff schedules, connect Google Calendar, and put booking buttons on your Instagram & website."*
* **Pricing**:
  - **Setup Fee**: $500 – $1,500 one-time.
  - **Hosting & Maintenance Retainer**: $30 – $60 / month per client.
* **Advantage**: 5 clients = **$3,500+ immediate cash** plus monthly recurring retainer.

---

### Model 3: Selling the Codebase / Whitelabel Licenses
You can package this repository and sell it to developers or agencies who want to launch their own booking platforms.

* **Marketplaces**: CodeCanyon, Gumroad, Lemon Squeezy, or direct B2B.
* **Recommended Pricing**:
  - **Regular Developer License**: $59 – $99 per copy.
  - **Extended / Reseller License**: $499 – $999 per copy.
  - **Custom Turnkey Exclusive Sale**: $3,000 – $7,000 to a single buyer.

---

## 4. Production Deployment Checklist

### Step 1: Database (Neon PostgreSQL)
1. Create a free/pro PostgreSQL database on [Neon.tech](https://neon.tech).
2. Copy the pooled connection string into `DATABASE_URL` and the direct connection string into `DIRECT_URL`.
3. Apply migrations:
   ```bash
   npx prisma db push
   ```

### Step 2: Stripe Production Setup
1. Create a Stripe account at [stripe.com](https://stripe.com).
2. Grab your `STRIPE_SECRET_KEY` (`sk_live_...`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_...`).
3. Under **Stripe Dashboard -> Webhooks**:
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `checkout.session.async_payment_failed`
     - `payment_intent.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the Signing Secret into `STRIPE_WEBHOOK_SECRET` (`whsec_...`).

### Step 3: Resend Email
1. Sign up on [resend.com](https://resend.com) and add your custom domain (e.g. `mail.yourdomain.com`).
2. Set `RESEND_API_KEY` and `EMAIL_FROM="Bookora <notifications@yourdomain.com>"`.

### Step 4: Google Calendar OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create OAuth 2.0 Credentials:
   - Authorized redirect URI: `https://your-domain.com/api/auth/google-calendar/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Step 5: Super Admin Email
Set your administrative email address:
```env
SUPER_ADMIN_EMAILS="yourname@gmail.com"
```

---

## 5. Summary of Architecture & Security

* **Multi-Tenant Isolation**: Tenant data is strictly scoped by `organizationId`. Cross-tenant queries are blocked at both the database layer and server action layer.
* **Role-Based Access Control**:
  - `OWNER`: Full organization control, billing, invitations, deletion.
  - `ADMIN`: Service management, staff assignments, schedule editing.
  - `STAFF`: Personal schedule and assigned booking management.
  - `SUPER ADMIN`: Global platform master administration via `/super-admin`.
* **Zero Transaction Fees**: Bookora does not take a percentage of tenant booking revenue, making it vastly more attractive than legacy platforms like Fresha or Square Appointments.
