/**
 * Test Setup for Medical-Grade Audio Recording
 * Critical for ensuring reliability in hospital environments
 */
declare const MediaRecorderMock: jest.Mock<any, any, any>;
declare class MockBlob extends Blob {
    arrayBuffer(): Promise<ArrayBuffer>;
}
//# sourceMappingURL=setup.d.ts.map