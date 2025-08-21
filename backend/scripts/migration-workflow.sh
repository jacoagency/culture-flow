#!/bin/bash

# CulturaFlow Database Migration Workflow
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV=${1:-development}
COMMAND=${2:-help}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Load environment variables
load_env() {
    if [ -f ".env.$ENV" ]; then
        log_info "Loading environment: $ENV"
        export $(cat .env.$ENV | grep -v '^#' | xargs)
    elif [ -f ".env" ]; then
        log_warning "Environment file .env.$ENV not found, using .env"
        export $(cat .env | grep -v '^#' | xargs)
    else
        log_error "No environment file found"
        exit 1
    fi
}

# Check database connection
check_db_connection() {
    log_info "Checking database connection..."
    if npx prisma db push --skip-generate >/dev/null 2>&1; then
        log_success "Database connection established"
    else
        log_error "Cannot connect to database. Please check your DATABASE_URL"
        exit 1
    fi
}

# Create backup
create_backup() {
    if [ "$ENV" = "production" ]; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        log_info "Creating backup: $BACKUP_FILE"
        
        # Extract database details from DATABASE_URL
        DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/')
        DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')
        DB_NAME=$(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')
        DB_USER=$(echo $DATABASE_URL | sed 's/.*\/\/\([^:]*\):.*/\1/')
        
        # Create backup directory
        mkdir -p ./backups
        
        # Create backup
        PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > ./backups/$BACKUP_FILE
        
        if [ -f "./backups/$BACKUP_FILE" ]; then
            log_success "Backup created: ./backups/$BACKUP_FILE"
        else
            log_error "Backup failed"
            exit 1
        fi
    fi
}

# Generate Prisma client
generate_client() {
    log_info "Generating Prisma client..."
    npx prisma generate
    log_success "Prisma client generated"
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    if [ "$ENV" = "development" ]; then
        npx prisma migrate dev --name "auto_migration_$(date +%Y%m%d_%H%M%S)"
    else
        npx prisma migrate deploy
    fi
    
    log_success "Migrations completed"
}

# Check migration status
check_migration_status() {
    log_info "Checking migration status..."
    npx prisma migrate status
}

# Seed database
seed_database() {
    if [ -f "./src/scripts/seed.ts" ]; then
        log_info "Seeding database..."
        npm run seed
        log_success "Database seeded"
    else
        log_warning "Seed script not found"
    fi
}

# Rollback migrations (development only)
rollback_migrations() {
    if [ "$ENV" != "development" ]; then
        log_error "Rollback is only available in development environment"
        exit 1
    fi
    
    log_warning "Rolling back last migration..."
    npx prisma migrate reset --force
    log_success "Migration rolled back"
}

# Validate schema
validate_schema() {
    log_info "Validating database schema..."
    npx prisma validate
    log_success "Schema validation passed"
}

# Show help
show_help() {
    echo "CulturaFlow Database Migration Workflow"
    echo ""
    echo "Usage: $0 <environment> <command>"
    echo ""
    echo "Environments:"
    echo "  development   - Local development environment"
    echo "  staging       - Staging environment"
    echo "  production    - Production environment"
    echo ""
    echo "Commands:"
    echo "  migrate       - Run pending migrations"
    echo "  status        - Check migration status"
    echo "  seed          - Seed database with initial data"
    echo "  backup        - Create database backup (production only)"
    echo "  rollback      - Rollback last migration (development only)"
    echo "  validate      - Validate database schema"
    echo "  full-deploy   - Complete deployment workflow"
    echo "  help          - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 development migrate"
    echo "  $0 production full-deploy"
    echo "  $0 staging status"
}

# Full deployment workflow
full_deploy() {
    log_info "Starting full database deployment for $ENV environment"
    
    load_env
    check_db_connection
    validate_schema
    
    if [ "$ENV" = "production" ]; then
        create_backup
    fi
    
    generate_client
    run_migrations
    check_migration_status
    
    if [ "$ENV" = "development" ] || [ "$ENV" = "staging" ]; then
        seed_database
    fi
    
    log_success "Full database deployment completed for $ENV environment"
}

# Main execution
main() {
    case $COMMAND in
        migrate)
            load_env
            check_db_connection
            generate_client
            run_migrations
            ;;
        status)
            load_env
            check_migration_status
            ;;
        seed)
            load_env
            seed_database
            ;;
        backup)
            load_env
            create_backup
            ;;
        rollback)
            load_env
            rollback_migrations
            ;;
        validate)
            validate_schema
            ;;
        full-deploy)
            full_deploy
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Check if running as script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi