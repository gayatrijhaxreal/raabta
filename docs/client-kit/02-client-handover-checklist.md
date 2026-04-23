# Client Handover Checklist

Use this at final delivery and take written confirmation from the client.

## A) Business Handover
- [ ] Live website URL shared
- [ ] Admin dashboard URL shared
- [ ] Final feature list shared
- [ ] Support/warranty timeline shared
- [ ] Training call completed (optional)

## B) Access and Ownership
- [ ] Domain registrar account access transferred
- [ ] Frontend hosting account access transferred
- [ ] Backend hosting account access transferred
- [ ] GitHub repository ownership transferred or client added as admin
- [ ] Database access shared (read/write/admin as agreed)

## C) Credentials and Secrets
- [ ] Admin token shared securely
- [ ] Hosting environment variables documented
- [ ] Rotated all temporary developer passwords
- [ ] 2FA enabled on client-owned accounts

## D) Environment Variables (for current project)
- [ ] DATABASE_URL
- [ ] ADMIN_TOKEN
- [ ] PUBLIC_API_BASE_URL (if used in deployment setup)
- [ ] NODE_ENV=production

## E) Technical Validation Before Sign-off
- [ ] Contact form submission works
- [ ] Contact data visible in admin panel
- [ ] Shop cart and checkout works
- [ ] Order submission works
- [ ] Admin endpoints return 401 without token
- [ ] Admin endpoints return data with valid token
- [ ] SSL active on frontend and backend

## F) Legal and Commercial
- [ ] Final invoice paid
- [ ] Copyright/IP transfer note shared
- [ ] Scope completion acknowledgement received
- [ ] Maintenance plan accepted/rejected in writing

## G) Domain/Hosting Change Readiness (Future)
- [ ] DNS records documented (A/CNAME)
- [ ] Current backend URL documented
- [ ] CORS allowed origins documented
- [ ] Backup export completed before migration
- [ ] Rollback plan prepared

## Client Sign-off
Client Name: [ ]

Date: [ ]

Signature/Approval Message: [ ]
