/**
 *
 * @param {{
*  beforeContains: string
*  afterContains: string
*  startingRuleId: string;
*  startingRuleType: string;
*  rules: string[];
*  actions: string[];
*  globalDeclarations: string[];
* }} data
* @returns {string}
*/

export const main = (data) => `
module parser
    implicit none
    character(len=:), allocatable, private :: input
    integer, private :: savePoint, lexemeStart, cursor
    ${data.globalDeclarations.join('\n')}

    interface toStr
        module procedure intToStr
        module procedure strToStr
    end interface

    ${data.beforeContains}

    contains

    function to_lower(strIn) result(strOut)
        character(len=*), intent(in) :: strIn
        character(len=len(strIn)) :: strOut
        integer :: i, j

        do i = 1, len(strIn)
            j = iachar(strIn(i:i))
            if (j >= iachar("A") .and. j <= iachar("Z")) then
                strOut(i:i) = achar(iachar(strIn(i:i)) + 32)
            else 
                strOut(i:i) = strIn(i:i)
            end if
        end do
    end function to_lower

    ${data.afterContains}

    function parse(str) result(res)
        character(len=:), allocatable :: str
        ${data.startingRuleType} :: res

        input = str
        cursor = 1

        res = ${data.startingRuleId}()
    end function parse

    ${data.rules.join('\n')}

    ${data.actions.join('\n')}

    function acceptString(str) result(accept)
        character(len=*) :: str
        logical :: accept
        integer :: offset

        offset = len(str) - 1
        if (str /= input(cursor:cursor + offset)) then
            accept = .false.
            cursor = cursor + 1
            return
        end if
        cursor = cursor + len(str)
        accept = .true.
    end function acceptString


    function acceptRange(bottom, top, isCase) result(accept)
        character(len=1) :: bottom, top
        logical, intent(in) :: isCase
        logical :: accept

        if (isCase) then
            if(.not. (to_lower(input(cursor:cursor)) >= bottom .and. to_lower(input(cursor:cursor)) <= top)) then
                accept = .false.
                cursor = cursor + 1
                return
            end if
        else
            if(.not. (input(cursor:cursor) >= bottom .and. input(cursor:cursor) <= top)) then
                accept = .false.
                cursor = cursor + 1
                return
            end if
        end if

        cursor = cursor + 1
        accept = .true.
    end function acceptRange

    function acceptSet(set, isCase) result(accept)
        character(len=1), dimension(:) :: set
        logical, intent(in) :: isCase
        logical :: accept

        if (isCase) then
            if(.not. (findloc(set, to_lower(input(cursor:cursor)), 1) > 0)) then
                accept = .false.
                cursor = cursor + 1
                return
            end if
        else
            if(.not. (findloc(set, input(cursor:cursor), 1) > 0)) then
                accept = .false.
                cursor = cursor + 1
                return
            end if
        end if

        cursor = cursor + 1
        accept = .true.
    end function acceptSet

    function acceptPeriod() result(accept)
        logical :: accept

        if (cursor > len(input)) then
            accept = .false.
            cursor = cursor + 1
            return
        end if
        cursor = cursor + 1
        accept = .true.
    end function acceptPeriod

    function acceptEOF() result(accept)
        logical :: accept

        if(.not. cursor > len(input)) then
            accept = .false.
            return
        end if
        accept = .true.
    end function acceptEOF

    function consumeInput() result(substr)
        character(len=:), allocatable :: substr

        substr = input(lexemeStart:cursor - 1)
    end function consumeInput

    subroutine pegError()
        print '(A,I1,A)', "Error at ", cursor, ": '"//input(cursor:cursor)//"'"

        call exit(1)
    end subroutine pegError


    function intToStr(int) result(cast)
        integer :: int
        character(len=31) :: tmp
        character(len=:), allocatable :: cast

        write(tmp, '(I0)') int
        cast = trim(adjustl(tmp))
    end function intToStr

    function strToStr(str) result(cast)
        character(len=:), allocatable :: str
        character(len=:), allocatable :: cast

        cast = str
    end function strToStr

end module parser
`;

/**
 *
 * @param {{
*  id: string;
*  returnType: string;
*  exprDeclarations: string[];
*  expr: string;
* }} data
* @returns
*/
export const rule = (data) => {
    return`
    function peg_${data.id}() result (res)
        ${data.returnTypes} :: res
        ${data.exprDeclarations.join('\n')}
        integer :: i
        integer :: j
        j = 0

        savePoint = cursor
        ${data.expr}
    end function peg_${data.id}
`};

/**
 *
 * @param {{
*  exprs: string[];
*  optionNumber: number;
*  type: string;
* }} data
* @returns
*/

export const election = (data) => `
    do i = 0, ${data.exprs.length}
        select case(i)
        ${data.exprs.map(
            (expr, i) => `
            case(${i})
                cursor = savePoint
                ${expr}
                exit
            `
        ).join('')}
        case default
            call pegError()
        end select
    end do
`;

/**
 *
 * @param {{
*  exprs: string[]
*  startingRule: boolean
*  resultExpr: string
*  type?: string
* }} data
* @returns
*/
export const union = (data) => `
    ${data.exprs.join('\n')}
    ${data.startingRule ? 'if (.not. acceptEOF()) cycle' : ''}
    ${data.type != 'group' ? `${data.resultExpr}` : ''}
`;

/**
 *
 * @param {{
*  expr: string;
*  destination: string
*  quantifier?: string;
*  number_1?: number
*  number_2?: number
*  type?: string
* }} data
* @returns
*/
export const strExpr = (data) => {
    
    if (!data.quantifier){
        return `
                ${data.type != 'group' ? 'lexemeStart = cursor': ''}
                if(.not. ${data.expr}) then
                    cursor = cursor - 1
                    cycle
                end if
                ${data.type != 'group' ? `${data.destination} = consumeInput()`: ''}
        `;
    }
    switch (data.quantifier) {
        case '+':
            return `
                lexemeStart = cursor
                if (.not. ${data.expr}) then
                    cursor = cursor - 1
                    cycle
                end if
                do while (.not. cursor > len(input))
                    if (.not. ${data.expr}) then
                        cursor = cursor - 1
                    exit
                    end if
                end do
                ${data.type != 'group' ? `${data.destination} = consumeInput()`: ''}
            `;
        case '*':
            return `
                lexemeStart = cursor
                do while (.not. cursor > len(input))
                    if (.not. ${data.expr}) then 
                        cursor = cursor - 1
                        exit
                    end if
                end do
                ${data.type != 'group' ? `${data.destination} = consumeInput()`: ''}
            `;
        case '?':
            return `
                lexemeStart = cursor
                if (.not. ${data.expr}) then
                    cursor = cursor - 1
                end if
                ${data.type != 'group' ? `${data.destination} = consumeInput()`: ''}
            `;
        case 'min-max':
            return `
                lexemeStart = cursor
                do while (cursor <= len(input))
                    if (.not. ${data.expr}) exit
                    j = j + 1
                end do
                if(.not. (j >= ${data.number_1} .and. j <= ${data.number_2})) cycle
                ${data.type != 'group' ? `${data.destination} = consumeInput()`: ''}
            `
        default:
            `'${data.quantifier}'`
            
    }
};


/**
 *
 * @param {{
*  exprs: string[];
* }} data
* @returns
*/
export const strResultExpr = (data) => `
        res = ${data.exprs.map((expr) => `toStr(${expr})`).join('//')}
`;


/**
 *
 * @param {{
*  fnId: string;
*  exprs: string[];
* }} data
* @returns
*/

export const fnResultExpr = (data) => `
    res = ${data.fnId}(${data.exprs.join(', ')})
`;

/**
 *
 * @param {{
*  ruleId: string;
*  choice: number
*  signature: string[];
*  returnType: string;
*  paramDeclarations: string[];
*  code: string;
* }} data
* @returns
*/
export const action = (data) => {
    const signature = data.signature.join(', ');
    return `
    function peg_${data.ruleId}_f${data.choice}(${signature}) result(res)
        ${data.paramDeclarations.join('\n')}
        ${data.returnType} :: res
        ${data.code}
    end function peg_${data.ruleId}_f${data.choice}
    `;
};


/**
 * @jaguzaro
 * @param {{
 *  destination: string;
 *  exprs: string[];
 *  groupNumber: number;
 * }} data
 */
export const group = (data) => {
    return `
    lexemeStart = cursor
    savePoint${data.groupNumber} = cursor
    do i_${data.groupNumber} = 0, ${data.exprs.length}
        select case(i_${data.groupNumber})
        ${data.exprs.map(
            (expr, i) => `
            case(${i})
                cursor = savePoint${data.groupNumber}
                ${expr}
                exit
            `
        ).join('')}
        case default
            exit
        end select
    end do
    ${data.destination} = consumeInput()
    `
}
    




