const request = require('supertest');
const { expect } = require('chai');
const server = require('../src/server');

describe('Users API', () => {
    let createdUserId;

    describe('POST /users', () => {
        it('should create a new user successfully', async () => {
            const res = await request(server)
                .post('/users')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    userRole: 'user'
                });

            expect(res.status).to.equal(201);
            expect(res.body.status).to.be.true;
            expect(res.body.data).to.be.a('number');
            createdUserId = res.body.data;
        });

        it('should return 400 if required fields are missing', async () => {
            const res = await request(server)
                .post('/users')
                .send({
                    firstName: 'John'
                });

            expect(res.status).to.equal(400);
            expect(res.body.success).to.be.false;
            expect(res.body.error.code).to.equal('BAD_REQUEST');
        });
    });

    describe('GET /users', () => {
        it('should allow admin to get all users', async () => {
            const res = await request(server)
                .get('/users')
                .set('x-user-role', 'admin');

            expect(res.status).to.equal(200);
            expect(res.body.status).to.be.true;
            expect(res.body.data).to.be.an('array');
        });

        it('should allow manager to get all users', async () => {
            const res = await request(server)
                .get('/users')
                .set('x-user-role', 'manager');

            expect(res.status).to.equal(200);
        });

        it('should forbid regular user from getting all users', async () => {
            const res = await request(server)
                .get('/users')
                .set('x-user-role', 'user');

            expect(res.status).to.equal(403);
            expect(res.body.error.code).to.equal('FORBIDDEN');
        });
    });

    describe('GET /users/:id', () => {
        it('should allow admin to get any user', async () => {
            const res = await request(server)
                .get(`/users/${createdUserId}`)
                .set('x-user-role', 'admin');

            expect(res.status).to.equal(200);
            expect(res.body.data.userId).to.equal(createdUserId);
        });

        it('should allow user to get their own data', async () => {
            const res = await request(server)
                .get(`/users/${createdUserId}`)
                .set('x-user-role', 'user')
                .set('x-user-id', createdUserId.toString());

            expect(res.status).to.equal(200);
            expect(res.body.data.userId).to.equal(createdUserId);
        });

        it('should forbid user from getting another user\'s data', async () => {
            const res = await request(server)
                .get(`/users/${createdUserId}`)
                .set('x-user-role', 'user')
                .set('x-user-id', '999');

            expect(res.status).to.equal(403);
        });

        it('should return 404 for non-existent user', async () => {
            const res = await request(server)
                .get('/users/999')
                .set('x-user-role', 'admin');

            expect(res.status).to.equal(404);
        });
    });

    describe('PUT /users/:id', () => {
        it('should allow manager to update a user', async () => {
            const res = await request(server)
                .put(`/users/${createdUserId}`)
                .set('x-user-role', 'manager')
                .send({
                    firstName: 'John',
                    lastName: 'Smith',
                    userRole: 'user'
                });

            expect(res.status).to.equal(200);
        });

        it('should forbid regular user from updating another user', async () => {
            const res = await request(server)
                .put(`/users/${createdUserId}`)
                .set('x-user-role', 'user')
                .set('x-user-id', '999')
                .send({
                    firstName: 'Jane',
                    lastName: 'Doe',
                    userRole: 'user'
                });

            expect(res.status).to.equal(403);
        });
    });

    describe('DELETE /users/:id', () => {
        it('should forbid manager from deleting a user', async () => {
            const res = await request(server)
                .delete(`/users/${createdUserId}`)
                .set('x-user-role', 'manager');

            expect(res.status).to.equal(403);
        });

        it('should allow admin to delete a user', async () => {
            const res = await request(server)
                .delete(`/users/${createdUserId}`)
                .set('x-user-role', 'admin');

            expect(res.status).to.equal(200);
        });

        it('should return 404 when deleting already deleted user', async () => {
            const res = await request(server)
                .delete(`/users/${createdUserId}`)
                .set('x-user-role', 'admin');

            expect(res.status).to.equal(404);
        });
    });
});
