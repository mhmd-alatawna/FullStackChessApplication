const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server');

describe('Server Global Configuration', () => {
    it('should return 404 with custom error format for undefined routes', async () => {
        const res = await request(app).get('/undefined-route');
        
        expect(res.status).to.equal(404);
        expect(res.body.success).to.be.false;
        expect(res.body.error.code).to.equal('NOT_FOUND');
        expect(res.body.error.message).to.contain('Route /undefined-route not found');
    });

    it('should have express.json() middleware working', async () => {
        // We can test this by sending a POST with JSON to a route that reads body
        // POST /users is already tested but this is a specific check
        const res = await request(app)
            .post('/users')
            .send({ firstName: 'Test' }) // missing other fields
            .set('Content-Type', 'application/json');
            
        // If express.json() wasn't there, req.body would be empty/undefined and we'd get a specific error
        expect(res.status).to.equal(400);
    });
});
