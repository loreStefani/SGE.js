define({

    BlendState : Object.freeze({
        /*
        * Let : 
        * 1) C and A be a RGB and a Alpha value
        * 2) _src and _dst be the new candidate value and the current value in the framebuffer
        * 
        */

        /* 
        * C_dst = A_src * C_src + (1 - A_src) * C_dst
        * A_dst = A_src * A_src + (1 - A_src) * A_dst
        */
        ALPHA_BLEND: 0,
        /* 
        * C_dst = C_dst
        * A_dst = A_dst
        */
        NO_COLOR: 1,
        /* 
        * C_dst = C_src + C_dst
        * A_dst = A_src + A_dst
        */
        ADD_BLEND: 2,
        /* 
        * C_dst = C_src - C_dst
        * A_dst = A_src - A_dst
        */
        SUB_BLEND: 3,
        /* 
        * C_dst = C_src * C_dst
        * A_dst = A_src * A_dst
        */
        MUL_BLEND: 4,
        /* 
        * C_dst = A_src * C_src + C_dst
        * A_dst = A_src * A_src + A_dst
        */
        ADD_ALPHA_BLEND: 5,

        NONE: 6
    }),

    CullState : Object.freeze({
        FRONT: 0,
        BACK: 1,
        FRONT_BACK: 2,
        NONE: 3
    }),

    DepthState : Object.freeze({
        LESS: 0,
        EQUAL: 1,
        GREATER: 2,
        ALWAYS: 3,
        NEVER: 4,
        LESS_EQUAL: 5,
        GREATER_EQUAL: 6,
        NOT_EQUAL: 7,
        NONE: 8
    })
});






