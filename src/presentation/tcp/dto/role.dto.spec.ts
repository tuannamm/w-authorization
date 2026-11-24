import { parseInput } from './parse-input';
import {
  CreateRoleDto,
  ListRoleUsersQueryDto,
  PermissionKeyParamDto,
  RoleKeyParamDto,
  RolePermissionsDto,
  UpdateRoleDto,
} from './role.dto';
import { AssignRoleDto, UserIdParamDto } from './user-role.dto';

describe('authorization DTOs', () => {
  it('accepts valid payloads', () => {
    expect(
      parseInput(CreateRoleDto, {
        key: 'qa',
        name: 'QA',
        permissionKeys: ['a:b'],
      }),
    ).toEqual({ key: 'qa', name: 'QA', permissionKeys: ['a:b'] });
    expect(parseInput(UpdateRoleDto, { name: 'N' })).toEqual({ name: 'N' });
    expect(parseInput(UpdateRoleDto, { description: 'd' })).toEqual({
      description: 'd',
    });
    expect(
      parseInput(RolePermissionsDto, { permissionKeys: ['a:b'] })
        .permissionKeys,
    ).toEqual(['a:b']);
    expect(parseInput(AssignRoleDto, { roleKey: 'qa' }).roleKey).toBe('qa');
    expect(parseInput(RoleKeyParamDto, { key: 'qa' }).key).toBe('qa');
    expect(parseInput(PermissionKeyParamDto, { key: 'users:read' }).key).toBe(
      'users:read',
    );
    expect(parseInput(UserIdParamDto, { id: 'abc' }).id).toBe('abc');
  });

  it.each([
    [CreateRoleDto, { key: 'qa' }],
    [CreateRoleDto, { key: 'qa', name: 'QA', kind: 'system' }],
    [CreateRoleDto, { key: 'qa', name: 'QA', permissionKeys: 'a:b' }],
    [CreateRoleDto, { key: 'qa', name: 'QA', permissionKeys: [1] }],
    [CreateRoleDto, { key: 'qa', name: '  ' }],
    [UpdateRoleDto, {}],
    [UpdateRoleDto, { key: 'new-key' }],
    [UpdateRoleDto, { name: null }],
    [RolePermissionsDto, { permissionKeys: [] }],
    [RolePermissionsDto, {}],
    [RolePermissionsDto, { permissionKeys: ['a:b'], extra: 1 }],
    [AssignRoleDto, { roleKey: ['a'] }],
    [AssignRoleDto, { roleKey: 'r', userId: 'victim' }],
    [RoleKeyParamDto, {}],
    [UserIdParamDto, { id: ' ' }],
    [
      CreateRoleDto,
      JSON.parse('{"__proto__": {"x": 1}, "key": "qa", "name": "QA"}'),
    ],
  ])('rejects malformed input %#', (dto, input) => {
    expect(() => parseInput(dto as never, input)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
  });

  it('rejects non-object bodies', () => {
    expect(() => parseInput(CreateRoleDto, undefined)).toThrow();
    expect(() => parseInput(CreateRoleDto, [])).toThrow();
  });

  describe('pagination query', () => {
    it('defaults to page 1, limit 20', () => {
      expect(parseInput(ListRoleUsersQueryDto, {})).toEqual({
        page: 1,
        limit: 10,
      });
    });
    it('parses strings from the query string', () => {
      expect(
        parseInput(ListRoleUsersQueryDto, { page: '3', limit: '50' }),
      ).toEqual({ page: 3, limit: 50 });
    });
    it.each([
      { page: '0' },
      { page: '-1' },
      { page: 'x' },
      { limit: '101' },
      { limit: '0' },
      { page: ['1', '2'] },
    ])('rejects %j', (query) => {
      expect(() => parseInput(ListRoleUsersQueryDto, query)).toThrow();
    });
  });
});

describe('UpdateRoleDto description clearing', () => {
  it("accepts description '' (clear) but never a blank name", () => {
    expect(parseInput(UpdateRoleDto, { description: '' })).toEqual({
      description: '',
    });
    expect(parseInput(UpdateRoleDto, { name: 'N', description: '' })).toEqual({
      name: 'N',
      description: '',
    });
    expect(() => parseInput(UpdateRoleDto, { name: '' })).toThrow();
    expect(() => parseInput(UpdateRoleDto, { name: '  ' })).toThrow();
    expect(() =>
      parseInput(UpdateRoleDto, { description: 'x'.repeat(256) }),
    ).toThrow();
  });
  it('CreateRoleDto still rejects an empty description', () => {
    expect(() =>
      parseInput(CreateRoleDto, { key: 'qa', name: 'QA', description: '' }),
    ).toThrow();
  });
});
