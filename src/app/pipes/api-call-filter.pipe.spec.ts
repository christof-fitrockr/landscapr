import { ApiCallFilterPipe } from './api-call-filter.pipe';
import { ApiCall, ApiType } from '../models/api-call';

describe('ApiCallFilterPipe', () => {
  let pipe: ApiCallFilterPipe;
  let items: ApiCall[];

  beforeEach(() => {
    pipe = new ApiCallFilterPipe();
    items = [
      { id: '1', name: 'Api 1', apiType: ApiType.System, status: 1 } as ApiCall,
      { id: '2', name: 'Api 2', apiType: ApiType.Business, status: 0 } as ApiCall,
      { id: '3', name: 'Api 3', apiType: ApiType.System, status: 1 } as ApiCall
    ];
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should filter by type', () => {
    const result = pipe.transform(items, '', false, [], ApiType.System);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should return all if type is null', () => {
    const result = pipe.transform(items, '', false, [], null);
    expect(result.length).toBe(3);
  });
});
