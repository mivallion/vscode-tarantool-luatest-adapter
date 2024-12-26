-- test/feature_test.lua
local t = require('luatest')
local g = t.group('feature')
-- Default name is inferred from caller filename when possible.
-- For `test/a/b/c_d_test.lua` it will be `a.b.c_d`.
-- So `local g = t.group()` works the same way.

-- Tests. All properties with name staring with `test` are treated as test cases.
g.test_example_1 = function()

end
g.test_example_n = function()

end

-- Define suite hooks
t.before_suite(function()  end)
t.before_suite(function()  end)

-- Hooks to run once for tests group
g.before_all(function()  end)
g.after_all(function()  end)

-- Hooks to run for each test in group
g.before_each(function()  end)
g.after_each(function()  end)

-- Hooks to run for a specified test in group
g.before_test('test_example_1', function()  end)
g.after_test('test_example_n', function()  end)
-- before_test runs after before_each
-- after_test runs before after_each

-- test/other_test.lua
local other_group = t.group('other')
-- 
other_group.test_example_2 = function()  end
other_group.test_example_m = function()  end

-- Define parametrized groups
local pg = t.group('pgroup', {{engine = 'memtx', a = 'b'}, {engine = 'v.in.yl'}})
pg.test_example_3 = function(cg)
    -- Use cg.params here
    box.schema.space.create('test', {
        engine = cg.params.engine,
    })
end
local c = 4
local pg1 = t.group('matrix', t.helpers.matrix({c = {c}, a = {1, 2}, b = {nil, '4', "5"}}))
pg1.test_example_3 = function(cg)
end

-- Hooks can be specified for one parameter
pg.before_all({engine = 'memtx'}, function()  end)
pg.before_each({engine = 'memtx'}, function()  end)
pg.before_test('test_example_3', {engine = 'vinyl'}, function()  end)