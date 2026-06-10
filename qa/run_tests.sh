#!/bin/bash

# QA Test Runner Script
# Sistema de Calificaciones - Automated QA Testing

set -e

echo "=========================================="
echo "QA Test Runner - Sistema de Calificaciones"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
SKIP=0

# Functions
log_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

log_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

log_skip() {
    echo -e "${YELLOW}⏭️  SKIP${NC}: $1"
    ((SKIP++))
}

log_info() {
    echo "ℹ️  INFO: $1"
}

# Check if server is running
check_server() {
    log_info "Verificando servidor..."
    if curl -s http://localhost:3000 > /dev/null; then
        log_pass "Servidor corriendo en http://localhost:3000"
        return 0
    else
        log_fail "Servidor no disponible en http://localhost:3000"
        echo "Inicia el servidor con: npm run dev"
        exit 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    echo ""
    echo "----------------------------------------"
    echo "Testing API Endpoints"
    echo "----------------------------------------"

    # Test GET /api/configuracion
    log_info "Testing GET /api/configuracion..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/configuracion)
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        log_pass "GET /api/configuracion returns $RESPONSE"
    else
        log_fail "GET /api/configuracion returns $RESPONSE (expected 200 or 401)"
    fi

    # Test GET /api/stats/dashboard
    log_info "Testing GET /api/stats/dashboard..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/stats/dashboard?trimestre=all")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        log_pass "GET /api/stats/dashboard returns $RESPONSE"
    else
        log_fail "GET /api/stats/dashboard returns $RESPONSE (expected 200 or 401)"
    fi

    # Test GET /api/asistencia/resumen
    log_info "Testing GET /api/asistencia/resumen..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/asistencia/resumen?gradoId=test&trimestre=1")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "401" ]; then
        log_pass "GET /api/asistencia/resumen returns $RESPONSE"
    else
        log_fail "GET /api/asistencia/resumen returns $RESPONSE (expected 200, 400, or 401)"
    fi
}

# Test build
test_build() {
    echo ""
    echo "----------------------------------------"
    echo "Testing Build"
    echo "----------------------------------------"

    log_info "Running npm run build..."
    if npm run build > /dev/null 2>&1; then
        log_pass "Build compilado exitosamente"
    else
        log_fail "Build falló"
    fi
}

# Test TypeScript
test_typescript() {
    echo ""
    echo "----------------------------------------"
    echo "Testing TypeScript"
    echo "----------------------------------------"

    log_info "Running TypeScript check..."
    if npx tsc --noEmit > /dev/null 2>&1; then
        log_pass "TypeScript compilation exitosa"
    else
        log_fail "TypeScript compilation falló"
    fi
}

# Test Prisma
test_prisma() {
    echo ""
    echo "----------------------------------------"
    echo "Testing Prisma"
    echo "----------------------------------------"

    log_info "Running Prisma generate..."
    if npx prisma generate > /dev/null 2>&1; then
        log_pass "Prisma Client generado exitosamente"
    else
        log_fail "Prisma generate falló"
    fi
}

# Main execution
main() {
    echo "Iniciando QA Test Suite..."
    echo ""

    # Run tests
    test_build
    test_typescript
    test_prisma
    check_server
    test_api_endpoints

    # Summary
    echo ""
    echo "=========================================="
    echo "QA Test Summary"
    echo "=========================================="
    echo -e "Total: $((PASS + FAIL + SKIP))"
    echo -e "${GREEN}Pasados: $PASS${NC}"
    echo -e "${RED}Fallidos: $FAIL${NC}"
    echo -e "${YELLOW}Saltados: $SKIP${NC}"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}✅ Todos los tests pasaron!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Algunos tests fallaron${NC}"
        exit 1
    fi
}

# Run main
main "$@"
