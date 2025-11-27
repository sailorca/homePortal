#!/bin/bash

SUBDOMAIN_FILE="/etc/nginx/demo-configs/subdomain-ports.conf"
TOKEN_FILE="/etc/nginx/demo-configs/tokens.conf"
DOMAIN_BASE="demo.anchoredtechnologies.net"

case $1 in
    "add-demo")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: demo-manager add-demo <subdomain> <port>"
            echo "Example: demo-manager add-demo inventory 3004"
            exit 1
        fi
        
        SUBDOMAIN="$2.$DOMAIN_BASE"
        PORT="$3"
        
        # Check if port is already in use
        if grep -q ":$PORT;" $SUBDOMAIN_FILE; then
            echo "❌ Port $PORT is already in use"
            grep ":$PORT;" $SUBDOMAIN_FILE
            exit 1
        fi
        
        # Add subdomain mapping
        echo "$SUBDOMAIN $PORT;" >> $SUBDOMAIN_FILE
        
        # Test and reload nginx
        nginx -t && systemctl reload nginx
        echo "✅ Demo '$2' added on port $PORT"
        echo "   URL: https://$SUBDOMAIN/?token=<your-token>"
        ;;
        
    "remove-demo")
        if [ -z "$2" ]; then
            echo "Usage: demo-manager remove-demo <subdomain>"
            exit 1
        fi
        
        SUBDOMAIN="$2.$DOMAIN_BASE"
        sed -i "/$SUBDOMAIN/d" $SUBDOMAIN_FILE
        nginx -t && systemctl reload nginx
        echo "✅ Demo '$2' removed"
        ;;
        
    "list-demos")
        echo "🚀 Active demo subdomains:"
        if [ -s "$SUBDOMAIN_FILE" ]; then
            cat $SUBDOMAIN_FILE | awk '{print "  • " $1 " → port " $2}' | sed 's/;//g'
        else
            echo "  No demos configured"
        fi
        ;;
        
    "add-token")
        if [ -z "$2" ]; then
            echo "Usage: demo-manager add-token <token-name>"
            exit 1
        fi
        echo "\"$2\" \"allowed\";" >> $TOKEN_FILE
        nginx -t && systemctl reload nginx
        echo "🔑 Token '$2' added"
        ;;
        
    "remove-token")
        if [ -z "$2" ]; then
            echo "Usage: demo-manager remove-token <token-name>"
            exit 1
        fi
        sed -i "/$2/d" $TOKEN_FILE
        nginx -t && systemctl reload nginx
        echo "🔑 Token '$2' removed"
        ;;
        
    "list-tokens") 
        echo "🔑 Active tokens:"
        if [ -s "$TOKEN_FILE" ]; then
            grep -o '"[^"]*"' $TOKEN_FILE | tr -d '"' | sed 's/^/  • /'
        else
            echo "  No tokens configured"
        fi
        ;;
        
    *)
        echo "Demo Manager - Anchored Technologies"
        echo "Usage: demo-manager {add-demo|remove-demo|list-demos|add-token|remove-token|list-tokens}"
        echo ""
        echo "Examples:"
        echo "  demo-manager add-demo inventory 3004"
        echo "  demo-manager add-token client-acme-jan"
        echo "  demo-manager list-demos"
        echo "  demo-manager remove-demo old-demo"
        ;;
esac
