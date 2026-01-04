# Production Readiness Checklist

Use this checklist before deploying Nargis to production.

## ✅ Backend (FastAPI)

### Security
- [ ] JWT_SECRET_KEY is strong (32+ random characters)
- [ ] ALLOWED_ORIGINS configured with actual frontend domains
- [ ] No hardcoded secrets in code
- [ ] All API keys stored as environment variables
- [ ] HTTPS enforced (force_https = true in fly.toml)
- [ ] CORS properly configured
- [ ] Rate limiting configured (if needed)

### Database
- [ ] PostgreSQL database created
- [ ] DATABASE_URL environment variable set
- [ ] All migrations run successfully
- [ ] Database backups enabled
- [ ] Connection pooling configured
- [ ] Database has strong password
- [ ] No SQLite in production (check DATABASE_URL)

### Code Quality
- [ ] All routes have authentication where needed
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Health check endpoint working
- [ ] No debug mode in production
- [ ] Dependency versions pinned in pyproject.toml

### Testing
- [ ] Authentication flow tested
- [ ] All CRUD operations tested
- [ ] User data isolation verified
- [ ] Token expiration tested
- [ ] Invalid token handling tested

### Configuration
- [ ] Dockerfile optimized and tested
- [ ] fly.toml configured correctly
- [ ] Port 8080 used consistently
- [ ] Release command for migrations set
- [ ] Auto-start/stop machines configured

## ✅ Frontend (Next.js)

### Configuration
- [ ] NEXT_PUBLIC_API_URL set to production backend
- [ ] Environment variables configured in Vercel
- [ ] Build succeeds locally
- [ ] No console.log statements in production code
- [ ] Error boundaries implemented

### Security
- [ ] API URL not hardcoded
- [ ] JWT tokens stored securely (HttpOnly Cookies)
- [ ] Tokens removed on logout
- [ ] Auto-logout on 401/403 responses
- [ ] No sensitive data in client-side code

### Performance
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Lighthouse score > 90
- [ ] Critical CSS inlined
- [ ] Fonts optimized

### User Experience
- [ ] Loading states implemented
- [ ] Error messages user-friendly
- [ ] Auth modals working
- [ ] Login/logout flow smooth
- [ ] Mobile responsive
- [ ] Dark mode working

## ✅ Deployment

### Pre-Deployment
- [ ] All environment variables documented
- [ ] Deployment guide reviewed (DEPLOYMENT.md)
- [ ] Database migrations ready
- [ ] Backup plan in place
- [ ] Rollback plan prepared

### Fly.io Backend
- [ ] Fly CLI installed
- [ ] Logged into Fly.io
- [ ] PostgreSQL database created
- [ ] Database attached to app
- [ ] Secrets set (JWT_SECRET_KEY, ALLOWED_ORIGINS)
- [ ] API keys set (if applicable)
- [ ] App deployed successfully
- [ ] Health check passing
- [ ] Logs reviewed

### Vercel Frontend
- [ ] Project imported from GitHub
- [ ] Root directory set to `apps/web`
- [ ] Environment variable NEXT_PUBLIC_API_URL set
- [ ] Build successful
- [ ] Preview deployment tested
- [ ] Production deployment successful

### Post-Deployment
- [ ] Backend URL accessible
- [ ] Frontend URL accessible
- [ ] Can register new user
- [ ] Can login
- [ ] Can create tasks/habits/goals
- [ ] Data persists after server restart
- [ ] CORS working (no browser errors)
- [ ] Auth flow end-to-end tested

## ✅ Monitoring

### Setup
- [ ] Fly.io monitoring dashboard reviewed
- [ ] Vercel analytics enabled
- [ ] Error tracking set up (optional: Sentry)
- [ ] Uptime monitoring configured
- [ ] Alerts configured for downtime

### Metrics to Watch
- [ ] Response times
- [ ] Error rates
- [ ] Database connections
- [ ] Memory usage
- [ ] CPU usage
- [ ] Request volume

## ✅ Documentation

### Required Docs
- [ ] DEPLOYMENT.md complete
- [ ] API_DOCS.md up to date
- [ ] README.md updated with production URLs
- [ ] Environment variables documented
- [ ] Migration process documented

### User-Facing
- [ ] Terms of Service (if needed)
- [ ] Privacy Policy (if needed)
- [ ] Support contact info
- [ ] FAQ or help docs

## ✅ Optional Enhancements

### Nice to Have
- [ ] Custom domain configured
- [ ] SSL certificate verified
- [ ] CDN configured for static assets
- [ ] Database query optimization
- [ ] Caching layer (Redis)
- [ ] API rate limiting
- [ ] Request logging
- [ ] Performance monitoring
- [ ] A/B testing setup
- [ ] Feature flags

### Future Improvements
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment
- [ ] Load testing
- [ ] Automated backups
- [ ] Disaster recovery plan
- [ ] Multi-region deployment
- [ ] Advanced analytics
- [ ] User feedback system

## 🚀 Launch Checklist

**Final Steps Before Going Live:**

1. [ ] Review all checkboxes above
2. [ ] Test critical user flows manually
3. [ ] Verify all environment variables
4. [ ] Check database migrations are applied
5. [ ] Review logs for errors
6. [ ] Test on mobile devices
7. [ ] Test in different browsers
8. [ ] Have rollback plan ready
9. [ ] Announce maintenance window (if applicable)
10. [ ] Deploy! 🎉

## Post-Launch

**First 24 Hours:**
- [ ] Monitor logs closely
- [ ] Check error rates
- [ ] Verify user registrations working
- [ ] Monitor database performance
- [ ] Be ready for quick fixes

**First Week:**
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Fix any critical bugs
- [ ] Optimize slow queries
- [ ] Update documentation as needed

---

## Quick Deployment Commands

### Backend (Fly.io)
```bash
cd apps/api-py
fly deploy
fly logs
```

### Frontend (Vercel)
```bash
cd apps/web
vercel --prod
```

### Database Migrations
```bash
fly ssh console -a nargis-api
alembic upgrade head
```

### Check Status
```bash
# Backend
fly status -a nargis-api
curl https://nargis-api.fly.dev/

# Frontend
curl https://nargis.vercel.app/
```

---

**Ready to launch? Go through this checklist one more time, then deploy with confidence!** 🚀
