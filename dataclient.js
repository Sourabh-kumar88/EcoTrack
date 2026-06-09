// dataclient.js — local storage backend (temporary until Firebase is connected)

class MockAuth {
    constructor() {
        this.listeners = [];
        const sessionData = localStorage.getItem('ecotrack_session');
        this._session = sessionData ? JSON.parse(sessionData) : null;
    }

    _notify(event, session) {
        this.listeners.forEach(listener => listener(event, session));
    }

    async getSession() {
        return { data: { session: this._session }, error: null };
    }

    onAuthStateChange(callback) {
        this.listeners.push(callback);
        return { data: { subscription: { unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        }}}};
    }

    async signUp({ email, password, options }) {
        const users = JSON.parse(localStorage.getItem('ecotrack_users')) || [];
        if (users.find(u => u.email === email)) {
            return { data: null, error: new Error('User already registered') };
        }

        const user = {
            id: 'mock-uuid-' + Date.now(),
            email,
            user_metadata: options?.data || {}
        };
        users.push(user);
        localStorage.setItem('ecotrack_users', JSON.stringify(users));

        const session = {
            access_token: 'mock-token',
            user: user
        };
        this._session = session;
        localStorage.setItem('ecotrack_session', JSON.stringify(session));
        this._notify('SIGNED_IN', session);

        return { data: { user, session }, error: null };
    }

    async signInWithPassword({ email, password }) {
        const users = JSON.parse(localStorage.getItem('ecotrack_users')) || [];
        const user = users.find(u => u.email === email);

        if (!user) {
            return { data: null, error: new Error('Invalid login credentials') };
        }

        const session = {
            access_token: 'mock-token',
            user: user
        };
        this._session = session;
        localStorage.setItem('ecotrack_session', JSON.stringify(session));
        this._notify('SIGNED_IN', session);

        return { data: { user, session }, error: null };
    }

    async signInWithOAuth({ provider, options }) {
        const user = {
            id: 'mock-uuid-' + provider + '-' + Date.now(),
            email: `user@${provider}.com`,
            user_metadata: { full_name: `${provider} User` }
        };

        const session = {
            access_token: 'mock-token',
            user: user
        };
        this._session = session;
        localStorage.setItem('ecotrack_session', JSON.stringify(session));
        this._notify('SIGNED_IN', session);

        setTimeout(() => {
            window.location.href = options?.redirectTo || '/dashboard.html';
        }, 500);

        return { data: { provider, url: options?.redirectTo }, error: null };
    }

    async signOut() {
        this._session = null;
        localStorage.removeItem('ecotrack_session');
        this._notify('SIGNED_OUT', null);
        return { error: null };
    }
}

class MockQuery {
    constructor(table) {
        this.table = table;
        this.data = JSON.parse(localStorage.getItem(`ecotrack_${table}`)) || [];
        this.queryType = 'select';
        this.pendingInsert = null;
        this.pendingUpdate = null;
        this.pendingUpsert = null;
        this.pendingDelete = false;
        this.filters = [];
        this.sorters = [];
        this.singleResult = false;
        this.maybeSingleResult = false;
    }

    select(columns) {
        this.queryType = 'select';
        return this;
    }

    insert(rows) {
        this.queryType = 'insert';
        this.pendingInsert = Array.isArray(rows) ? rows : [rows];
        return this;
    }

    update(updates) {
        this.queryType = 'update';
        this.pendingUpdate = updates;
        return this;
    }

    upsert(row) {
        this.queryType = 'upsert';
        this.pendingUpsert = row;
        return this;
    }

    delete() {
        this.queryType = 'delete';
        this.pendingDelete = true;
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.sorters.push({ column, ascending });
        return this;
    }

    eq(column, value) {
        this.filters.push(item => item[column] === value);
        return this;
    }

    neq(column, value) {
        this.filters.push(item => item[column] !== value);
        return this;
    }

    single() {
        this.singleResult = true;
        return this;
    }

    maybeSingle() {
        this.singleResult = true;
        this.maybeSingleResult = true;
        return this;
    }

    then(resolve, reject) {
        setTimeout(() => {
            try {
                let currentData = [...this.data];

                if (this.queryType === 'select') {
                    for (const filter of this.filters) currentData = currentData.filter(filter);
                    for (const sort of this.sorters) {
                        currentData.sort((a, b) => {
                            if (a[sort.column] < b[sort.column]) return sort.ascending ? -1 : 1;
                            if (a[sort.column] > b[sort.column]) return sort.ascending ? 1 : -1;
                            return 0;
                        });
                    }
                    if (this.singleResult) {
                        resolve({
                            data: currentData[0] || null,
                            error: this.maybeSingleResult || currentData.length ? null : new Error('Row not found')
                        });
                    } else {
                        resolve({ data: currentData, error: null });
                    }
                }
                else if (this.queryType === 'insert') {
                    const newRows = this.pendingInsert.map(r => ({
                        ...r,
                        id: r.id || 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                        created_at: new Date().toISOString()
                    }));
                    this.data.push(...newRows);
                    localStorage.setItem(`ecotrack_${this.table}`, JSON.stringify(this.data));
                    resolve({ data: newRows, error: null });
                }
                else if (this.queryType === 'update') {
                    for (const filter of this.filters) currentData = currentData.filter(filter);
                    const idsToUpdate = new Set(currentData.map(item => item.id));

                    this.data = this.data.map(item => {
                        if (idsToUpdate.has(item.id)) return { ...item, ...this.pendingUpdate };
                        return item;
                    });
                    localStorage.setItem(`ecotrack_${this.table}`, JSON.stringify(this.data));
                    resolve({ data: this.data.filter(item => idsToUpdate.has(item.id)), error: null });
                }
                else if (this.queryType === 'upsert') {
                    const id = this.pendingUpsert.id;
                    const existingIndex = this.data.findIndex(item => item.id === id);
                    if (existingIndex >= 0) {
                        this.data[existingIndex] = { ...this.data[existingIndex], ...this.pendingUpsert };
                    } else {
                        this.data.push({ ...this.pendingUpsert, created_at: new Date().toISOString() });
                    }
                    localStorage.setItem(`ecotrack_${this.table}`, JSON.stringify(this.data));
                    resolve({ data: [this.pendingUpsert], error: null });
                }
                else if (this.queryType === 'delete') {
                    for (const filter of this.filters) {
                        this.data = this.data.filter(item => !filter(item));
                    }
                    localStorage.setItem(`ecotrack_${this.table}`, JSON.stringify(this.data));
                    resolve({ data: null, error: null });
                }
            } catch (error) {
                resolve({ data: null, error });
            }
        }, 50);
    }
}

class MockDataClient {
    constructor() {
        this.auth = new MockAuth();
    }

    from(table) {
        return new MockQuery(table);
    }
}

export const db = new MockDataClient();
