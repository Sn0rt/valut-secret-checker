#!/bin/bash

# HashiCorp Vault Secret Checker CLI
# Provides command-line interface matching the web UI functionality

VERSION="1.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENDPOINT=""
ROLE_ID=""
SECRET_ID=""
SECRET_PATH=""
VAULT_TOKEN=""

show_help() {
    cat << EOF
HashiCorp Vault Secret Checker CLI v${VERSION}

USAGE:
    $0 -e ENDPOINT --role_id ROLE_ID --secret_id SECRET_ID --secret-path SECRET_PATH

OPTIONS:
    -e, --endpoint ENDPOINT        Vault endpoint URL (required)
    --role_id ROLE_ID              Role ID for AppRole authentication (required)
    --secret_id SECRET_ID          Secret ID for AppRole authentication (required)
    --secret-path PATH             Secret path to retrieve (required, e.g., myapp/config)
    -h, --help                     Show this help message

EXAMPLE:
    # Authenticate and get secret
    $0 -e http://localhost:8200 --role_id "xxx" --secret_id "yyy" --secret-path "myapp/config"

ENVIRONMENT VARIABLES:
    VAULT_ENDPOINT                 Default endpoint if -e not specified
    VAULT_ROLE_ID                  Default role ID if --role_id not specified  
    VAULT_SECRET_ID                Default secret ID if --secret_id not specified

EOF
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

# Make HTTP request with error handling
make_request() {
    local method="$1"
    local url="$2" 
    local data="$3"
    local headers="$4"
    
    log_info "Making $method request to: $url"
    
    local curl_cmd="curl -s -X $method"
    
    if [[ -n "$headers" ]]; then
        while IFS= read -r header; do
            curl_cmd="$curl_cmd -H '$header'"
        done <<< "$headers"
    fi
    
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response
    response=$(eval "$curl_cmd" 2>/dev/null)
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Request failed with curl exit code: $exit_code"
        return 1
    fi
    
    echo "$response"
    return 0
}

# Validate required parameters
validate_endpoint() {
    if [[ -z "$ENDPOINT" ]]; then
        if [[ -n "$VAULT_ENDPOINT" ]]; then
            ENDPOINT="$VAULT_ENDPOINT"
        else
            log_error "Endpoint is required. Use -e/--endpoint or set VAULT_ENDPOINT environment variable"
            return 1
        fi
    fi
    
    # Remove trailing slash
    ENDPOINT="${ENDPOINT%/}"
    log_info "Using endpoint: $ENDPOINT"
    return 0
}

vault_login() {
    validate_endpoint || return 1
    
    if [[ -z "$ROLE_ID" && -n "$VAULT_ROLE_ID" ]]; then
        ROLE_ID="$VAULT_ROLE_ID"
    fi
    if [[ -z "$SECRET_ID" && -n "$VAULT_SECRET_ID" ]]; then
        SECRET_ID="$VAULT_SECRET_ID"  
    fi
    
    if [[ -z "$ROLE_ID" || -z "$SECRET_ID" ]]; then
        log_error "AppRole authentication requires --role_id and --secret_id"
        return 1
    fi
    
    local login_url="$ENDPOINT/v1/auth/approle/login"
    local login_data="{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}"
    
    log_info "Attempting AppRole authentication..."
    
    local response
    response=$(make_request "POST" "$login_url" "$login_data" "Content-Type: application/json")
    
    if [[ $? -ne 0 ]]; then
        log_error "Login request failed"
        return 1
    fi
    
    # Parse token from response
    VAULT_TOKEN=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    token = data.get('auth', {}).get('client_token', '')
    if token:
        print(token)
    else:
        print('ERROR: No token in response', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f'ERROR: Failed to parse login response: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null)
    
    if [[ $? -ne 0 || -z "$VAULT_TOKEN" ]]; then
        log_error "Failed to extract token from login response"
        return 1
    fi
    
    log_success "Login successful! Token obtained."
    
    echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    auth_data = data.get('auth', {})
    output = {
        'success': True,
        'token': auth_data.get('client_token', ''),
        'renewable': auth_data.get('renewable', False),
        'lease_duration': auth_data.get('lease_duration', 0),
        'policies': auth_data.get('policies', [])
    }
    print(json.dumps(output, indent=2))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}, indent=2))
"
    
    return 0
}

vault_lookup() {
    validate_endpoint || return 1
    
    if [[ -z "$VAULT_TOKEN" ]]; then
        log_error "No token available. Please login first or set VAULT_TOKEN environment variable"
        return 1
    fi
    
    local lookup_url="$ENDPOINT/v1/auth/token/lookup-self"
    
    log_info "Looking up token information..."
    
    local response
    response=$(make_request "GET" "$lookup_url" "" "X-Vault-Token: $VAULT_TOKEN
Content-Type: application/json")
    
    if [[ $? -ne 0 ]]; then
        log_error "Token lookup request failed"
        return 1
    fi
    
    # Check if response contains error
    local has_error
    has_error=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'errors' in data:
        print('true')
        print(f'Token lookup failed: {data[\"errors\"]}', file=sys.stderr)
        sys.exit(1)
    else:
        print('false')
except:
    print('true')
    sys.exit(1)
" 2>/dev/null)
    
    if [[ "$has_error" == "true" ]]; then
        log_error "Token lookup failed"
        return 1
    fi
    
    log_success "Token lookup successful!"
    
    echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    token_data = data.get('data', {})
    output = {
        'success': True,
        'data': {
            'id': token_data.get('id', ''),
            'display_name': token_data.get('display_name', ''),
            'policies': token_data.get('policies', []),
            'ttl': token_data.get('ttl', 0),
            'creation_time': token_data.get('creation_time', ''),
            'expire_time': token_data.get('expire_time', ''),
            'renewable': token_data.get('renewable', False)
        }
    }
    print(json.dumps(output, indent=2))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}, indent=2))
"
    
    return 0
}

vault_get_secret() {
    validate_endpoint || return 1
    
    if [[ -z "$VAULT_TOKEN" ]]; then
        log_error "No token available. Please login first or set VAULT_TOKEN environment variable"
        return 1
    fi
    
    if [[ -z "$SECRET_PATH" ]]; then
        log_error "Secret path is required. Use --secret-path option"
        return 1
    fi
    
    # Clean the secret path (remove leading slash)
    SECRET_PATH="${SECRET_PATH#/}"
    
    local secret_url="$ENDPOINT/v1/secret/data/$SECRET_PATH"
    
    log_info "Retrieving secret from path: $SECRET_PATH"
    
    local response
    response=$(make_request "GET" "$secret_url" "" "X-Vault-Token: $VAULT_TOKEN
Content-Type: application/json")
    
    if [[ $? -ne 0 ]]; then
        log_error "Secret retrieval request failed"
        return 1
    fi
    
    # Check if response contains error
    local has_error
    has_error=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'errors' in data:
        print('true')
        print(f'Secret retrieval failed: {data[\"errors\"]}', file=sys.stderr)
        sys.exit(1)
    else:
        print('false')
except:
    print('true')
    sys.exit(1)
" 2>/dev/null)
    
    if [[ "$has_error" == "true" ]]; then
        log_error "Failed to retrieve secret"
        return 1
    fi
    
    log_success "Secret retrieved successfully!"
    
    echo "$response" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
    secret_data = data.get('data', {}).get('data', {})
    metadata = data.get('data', {}).get('metadata', {})
    
    # Return all keys
    output = {
        'success': True,
        'data': {
            'secret_path': '$SECRET_PATH',
            'all_secrets': secret_data,
            'all_keys': list(secret_data.keys()),
            'total_keys': len(secret_data),
            'requested_single_key': False,
            'metadata': metadata
        }
    }
    
    print(json.dumps(output, indent=2))
    
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}, indent=2))
"
    
    return 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--endpoint)
                ENDPOINT="$2"
                shift 2
                ;;
            --role_id)
                ROLE_ID="$2" 
                shift 2
                ;;
            --secret_id)
                SECRET_ID="$2"
                shift 2
                ;;
            --secret-path)
                SECRET_PATH="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

main() {
    parse_args "$@"
    
    # Validate that all required parameters are provided
    if [[ -z "$ENDPOINT" && -z "$VAULT_ENDPOINT" ]]; then
        log_error "Endpoint is required. Use -e/--endpoint or set VAULT_ENDPOINT environment variable"
        show_help
        exit 1
    fi
    
    if [[ -z "$ROLE_ID" && -z "$VAULT_ROLE_ID" ]]; then
        log_error "Role ID is required. Use --role_id or set VAULT_ROLE_ID environment variable"
        show_help
        exit 1
    fi
    
    if [[ -z "$SECRET_ID" && -z "$VAULT_SECRET_ID" ]]; then
        log_error "Secret ID is required. Use --secret_id or set VAULT_SECRET_ID environment variable"
        show_help
        exit 1
    fi
    
    if [[ -z "$SECRET_PATH" ]]; then
        log_error "Secret path is required. Use --secret-path"
        show_help
        exit 1
    fi
    
    # Use existing token if available
    if [[ -n "$VAULT_TOKEN" ]]; then
        log_info "Using existing VAULT_TOKEN from environment"
    fi
    
    # Execute the full flow: login -> lookup -> get-secret
    log_info "Starting full flow: login -> lookup -> get-secret"
    
    if ! vault_login; then
        log_error "Login failed, aborting"
        exit 1
    fi
    
    echo "---" >&2
    
    if ! vault_lookup; then
        log_warning "Token lookup failed, but continuing with secret retrieval"
    fi
    
    echo "---" >&2
    
    if ! vault_get_secret; then
        log_error "Secret retrieval failed"
        exit 1
    fi
}

# Run main function
main "$@"