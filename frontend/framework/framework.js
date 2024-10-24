class AppFramework {
    constructor(initialData = {}) {
        this.appState = initialData;
        this.stateListeners = new Set();
        this.eventHandlers = {};
        this.routeHandlers = {};
        window.addEventListener('popstate', () => this.handleRouteUpdate());
    }

    // Returns the current state of the application
    getState() {
        return this.appState;
    }

    // Updates the application state and notifies listeners of the change
    updateState(newState) {
        const stateChanged = Object.keys(newState).some(
            key => this.appState[key] !== newState[key]
        );
        if (stateChanged) {
            this.appState = { ...this.appState, ...newState }; 
            this.stateListeners.forEach(listener => listener(this.appState)); 
        }
    }

    
    subscribeToStateChanges(listener) {
        this.stateListeners.add(listener);
    }

    // Creates a virtual DOM element with a tag, attributes, and children
    createDomElement(tag, attributes = {}, children = []) {
        return { tag, attributes, children };
    }

    // Appends a virtual DOM element to the actual DOM tree
    appendDomElement(domNode, parent) {
        if (typeof domNode === 'string') {
            parent.textContent = domNode;
            return;
        }

        const element = document.createElement(domNode.tag);
        Object.entries(domNode.attributes).forEach(([key, value]) => {
            key.startsWith('on')
                ? element.addEventListener(key.slice(2).toLowerCase(), value)
                : element.setAttribute(key, value);
        });

        domNode.children.forEach(child => this.appendDomElement(child, element));
        parent.appendChild(element);
    }

    // Renders the virtual DOM tree into the actual DOM
    renderDomTree(virtualDom, container) {
        container.innerHTML = ''; 
        this.appendDomElement(virtualDom, container); 
    }

    // Defines a route and associates it with a callback function
    defineRoute(routePath, callback) {
        const paramPattern = routePath.replace(/:([^\/]+)/g, '([^\/]+)');
        this.routeHandlers[routePath] = {
            regex: new RegExp(`^${paramPattern}$`),
            callback: callback
        };
    }

    // Navigates to a new route and triggers the appropriate callback
    navigateTo(routePath) {
        history.pushState({}, '', routePath); 
        this.handleRouteUpdate(); 
    }

    // Handles route changes and calls the associated route callback
    handleRouteUpdate() {
        const currentPath = window.location.pathname;
        for (const route in this.routeHandlers) {
            const match = currentPath.match(this.routeHandlers[route].regex);
            if (match) {
                this.routeHandlers[route].callback(...match.slice(1)); 
                return;
            }
        }
    }

    // Adds event handler for a specific event
    addEventHandler(eventName, callback) {
        this.eventHandlers[eventName] = this.eventHandlers[eventName] || new Set();
        this.eventHandlers[eventName].add(callback);
    }

    // Triggers all event handlers associated with a specific event
    triggerEvent(eventName, eventData) {
        (this.eventHandlers[eventName] || []).forEach(callback => callback(eventData));
    }
}