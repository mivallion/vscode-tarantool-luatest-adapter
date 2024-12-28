export const JSONPlugin = `local json = require('json')
local Output = require('luatest.output.generic'):new_class()

local res = {}

function Output.mt:start_suite()
    res = {
        started_on = self.result.start_time,
        tests = {},
    }
end

function Output.mt:end_test(node)
    local test = {
        name = node.name,
        message = node.message,
        group = node.group.name,
    }

    if node:is('xfail') then
        test.xfail = true
    end

    if node:is('skip') then
        test.skip = true
    end

    if node:is('success') then
        test.status = 'OK'
    end

    if node:is('fail')then
        test.status = 'FAIL'
    end

    if node:is('error')then
        test.status = 'ERROR'
    end

    table.insert(res.tests, test)
end

function Output.mt:end_suite()
    local tests = self.result.tests
    res.xfail = #tests.xfail
    res.xsuccess = #tests.xsuccess
    res.fail = #tests.fail
    res.error = #tests.error
    res.skip = #tests.skip
    res.all = #tests.all
    res.success = #tests.success
    res.duration = self.result.duration

    print(json.encode(res))
end

return Output
`;

export const JSONListFlagBefore = `elseif arg == '--list-test-cases' then
            result.list_test_cases = true`;

export const JSONListFlag = `elseif arg == '--list-test-cases' then
            -- Modified by vscode-tarantool-luatest-adapter
            result.list_test_cases = true
        elseif arg == '--list-test-cases-json' then
            result.list_test_cases_json = true`;

export const JSONListBefore = `-- Handle the --list-test-case CLI option.
    if self.list_test_cases then
        for _, test_case in ipairs(filtered_list[true]) do
            print(test_case.name)
        end
        return 0
    end`;

export const JSONList = `-- Handle the --list-test-case CLI option.
    -- Modified by vscode-tarantool-luatest-adapter
    if self.list_test_cases then
        for _, test_case in ipairs(filtered_list[true]) do
            print(test_case.name)
        end
        return 0
    end

    -- Handle the --list-test-cases-json CLI option.
    if self.list_test_cases_json then
        print('{\\n"tests":[')
        local tests_info = nil
        for _, test in pairs(self:find_tests()) do
            local test_info = ('{"name":"%s", "group":"%s", "method_name":"%s", "line":%s}'):format(test.name:gsub('"', '\\\\"'), test.group.name:gsub('"', '\\\\"'), test.method_name, test.line)
            if tests_info then
                tests_info = tests_info .. ',\\n' .. test_info
            else
                tests_info = test_info
            end
        end
        print(tests_info)
        print("],")

        print('"groups":[')
        local groups_info = nil
        for _, group in pairs(self.groups) do
            local group_info = ('{"name":"%s", "file":"%s"}'):format(group.name:gsub('"', '\\\\"'), group.file)
            if groups_info then
                groups_info = groups_info .. ',\\n' .. group_info
            else
                groups_info = group_info
            end
        end
        print(groups_info)
        print("]\\n}")
        return 0
    end`;

export const GroupFileBefore = `end
    self.name = name`;

export const GroupFileAfter = `end
    -- Modified by vscode-tarantool-luatest-adapter
    self.name = name

    local pattern = '.*/test/(.+)_test%.lua'
    local info = assert(
        find_closest_matching_frame(pattern),
        "Can't derive test name from file name (it should match '.*/test/.*_test.lua')"
    )
    local test_filename = info.source
    self.file = test_filename`;