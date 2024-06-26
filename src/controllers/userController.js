import User from "../models/User";
import Video from "../models/Video";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });

export const postJoin = async (req, res) => {
    const { name, username, email, password, password2, location } = req.body;
    const pageTitle = "Join";
    if (password !== password2)
        return res.status(400).render("join", { pageTitle, errorMessage: "Password confirmation does not match." });

    const exists = await User.exists({ $or: [{ username }, { email }] });
    if (exists)
        return res.status(400).render("join", { pageTitle, errorMessage: "This username/email is already taken." });

    try {
        await User.create({
            name,
            username,
            email,
            password,
            location,
            avatarUrl: "",
        });
        return res.redirect("/login");
    } catch (error) {
        return res.status(400).render("join", { pageTitle, errorMessage: error._message });
    }
};

export const getEdit = (req, res) => {
    return res.render("users/edit-profile", { pageTitle: "Edit Profile" });
};

export const postEdit = async (req, res) => {
    const {
        session: {
            user: { _id, username: sessionUsername, email: sessionEmail, avatarUrl },
        },
        body: { name, email, username, location },
        file,
    } = req;
    console.log(file);

    let exists = undefined;
    //if username or email changed, verify same username or email
    if (sessionUsername !== username || sessionEmail !== email) {
        exists = await User.exists({ $and: [{ _id: { $ne: _id } }, { $or: [{ username }, { email }] }] });
    }

    //exists can be undefined(username or email is not changed) or false(username or email is changed but can't find same username/email)
    if (!exists) {
        const updatedUser = await User.findByIdAndUpdate(
            _id,
            { name, email, username, location, avatarUrl: file ? file.location : avatarUrl },
            { new: true }
        );
        console.log(updatedUser);
        // req.session.user = {
        //     ...req.session.user,
        //     name,
        //     email,
        //     username,
        //     location,
        // };
        req.session.user = updatedUser;

        return res.redirect(`/users/${_id}`);
    }
    //same username / email
    return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
    if (req.session.user.socialOnly) {
        req.flash("error", "Can't change password!");
        return res.redirect("/");
    }
    return res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
    const {
        session: {
            user: { _id, password },
        },
        body: { oldPassword, newPassword, newPasswordConfirmation },
    } = req;
    console.log(password);
    console.log(oldPassword);
    const ok = await bcrypt.compare(oldPassword, password);
    if (!ok) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "The current Password is incorrect.",
        });
    }
    if (newPassword !== newPasswordConfirmation) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "The new password does not match the confirmation.",
        });
    }
    const user = await User.findById(_id);
    console.log(user.password);
    user.password = newPassword;
    await user.save();
    req.session.user.password = user.password;
    req.flash("info", "Password Updated");
    return res.redirect("/users/logout");
};

export const getLogin = (req, res) => res.render("login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
    const { username, password } = req.body;
    const pageTitle = "Login";

    //check if account exists
    const user = await User.findOne({ username, socialOnly: false });
    if (!user)
        return res
            .status(400)
            .render("login", { pageTitle, errorMessage: "An account with this username does not exist." });

    //check if password correct
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.status(400).render("login", { pageTitle, errorMessage: "Wrong password!" });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
};

export const startGithubLogin = (req, res) => {
    const baseUrl = `https://github.com/login/oauth/authorize`;
    const config = {
        client_id: process.env.GH_CLIENT,
        allow_signup: false,
        scope: "read:user user:email",
    };
    const params = new URLSearchParams(config).toString();
    const finalUrl = `${baseUrl}?${params}`;
    return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
    const baseUrl = `https://github.com/login/oauth/access_token`;
    const config = {
        client_id: process.env.GH_CLIENT,
        client_secret: process.env.GH_SECRET,
        code: req.query.code,
    };
    console.log(config);
    const params = new URLSearchParams(config).toString();
    console.log(params);
    const finalUrl = `${baseUrl}?${params}`;
    const tokenRequest = await (
        await fetch(finalUrl, { method: "POST", headers: { Accept: "application/json" } })
    ).json();
    console.log(tokenRequest);
    if ("access_token" in tokenRequest) {
        //access api
        const { access_token } = tokenRequest;
        const apiUrl = "https://api.github.com";
        const userData = await (
            await fetch(`${apiUrl}/user`, {
                headers: {
                    Authorization: `token ${access_token}`,
                },
            })
        ).json();
        console.log(userData);
        const emailData = await (
            await fetch(`${apiUrl}/user/emails`, {
                headers: {
                    Authorization: `token ${access_token}`,
                },
            })
        ).json();
        console.log(emailData);
        const emailObj = emailData.find((email) => email.primary && email.verified);
        if (!emailObj) {
            return res.redirect("/login");
        }
        let user = await User.findOne({ email: emailObj.email });
        if (!user) {
            //create account
            user = await User.create({
                name: userData.name,
                avatarUrl: userData.avatar_url,
                username: userData.login,
                email: emailObj.email,
                password: "",
                socialOnly: true,
                location: userData.location,
            });
        }
        req.session.loggedIn = true;
        req.session.user = user;
        return res.redirect("/");
    } else {
        return res.redirect("/login");
    }
};

export const logout = (req, res) => {
    req.flash("info", "Bye Bye");
    req.session.destroy();
    return res.redirect("/");
};

export const see = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).populate({
        path: "videos",
        populate: {
            path: "owner",
            model: "User",
        },
    });
    if (!user) {
        return res.status(404).render("404", { pageTitle: "User not Found" });
    }
    //const videos = await Video.find({ owner: id });
    //const videos = await User.findById(id).populate("videos");
    // console.log(videos);

    console.log(res);
    return res.render("users/profile", { pageTitle: `${user.name}'s Profile`, user });
};
